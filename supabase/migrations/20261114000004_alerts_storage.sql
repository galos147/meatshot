-- MEAT STOCK: scheduled alerts (pg_cron) and file storage.

-- ---------------------------------------------------------------- alerts
-- Idempotent: safe to run as often as we like. Raises each alert once while it is live
-- (partial unique index on dedupe_key) and resolves alerts whose condition has cleared.
create function public.generate_alerts() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.store_today();
  v_days int[];
  v_max int;
  inserted int := 0;
  c int;
begin
  select array(select unnest(expiry_alert_days) order by 1) into v_days from public.app_settings where id = 1;
  v_max := v_days[array_length(v_days, 1)];

  -- Batches that still hold stock.
  drop table if exists pg_temp._live;
  create temp table _live on commit drop as
  select b.id, b.batch_number, b.product_id, b.expiry_date, p.name as product_name,
         (b.expiry_date - v_today) as d, sum(sl.qty_kg) as qty
    from public.batches b
    join public.products p on p.id = b.product_id
    join public.stock_levels sl on sl.batch_id = b.id
   group by b.id, p.name
  having sum(sl.qty_kg) > 0;

  -- Expired.
  insert into public.alerts (alert_type, severity, title, message, batch_id, product_id, dedupe_key)
  select 'expired', 'critical', 'פג תוקף: ' || l.product_name,
         format('אצווה %s פג תוקפה ב-%s. במלאי: %s ק"ג. אסור למכור – יש להשמיד או לטפל.',
                l.batch_number, to_char(l.expiry_date, 'DD/MM/YYYY'), l.qty),
         l.id, l.product_id, 'expired:' || l.id
    from pg_temp._live l where l.d < 0
  on conflict (dedupe_key) where status <> 'resolved' do nothing;
  get diagnostics c = row_count; inserted := inserted + c;

  -- Expiring soon: one alert per threshold crossed (14 → 7 → 3 by default).
  insert into public.alerts (alert_type, severity, title, message, batch_id, product_id, threshold_days, dedupe_key)
  select 'expiry_soon',
         case when t.th <= 3 then 'critical' when t.th <= 7 then 'warning' else 'info' end::public.alert_severity,
         format('תפוגה בעוד %s ימים: %s', l.d, l.product_name),
         format('אצווה %s תפוג ב-%s (בעוד %s ימים). במלאי: %s ק"ג.',
                l.batch_number, to_char(l.expiry_date, 'DD/MM/YYYY'), l.d, l.qty),
         l.id, l.product_id, t.th, 'expiry:' || l.id || ':' || t.th
    from pg_temp._live l
    cross join lateral (select min(x) as th from unnest(v_days) x where l.d <= x) t
   where l.d >= 0 and t.th is not null
  on conflict (dedupe_key) where status <> 'resolved' do nothing;
  get diagnostics c = row_count; inserted := inserted + c;

  -- A newer, tighter expiry alert supersedes the older ones for the same batch.
  update public.alerts a set status = 'resolved', resolved_at = now()
   where a.status <> 'resolved' and a.alert_type = 'expiry_soon'
     and exists (select 1 from public.alerts n
                  where n.batch_id = a.batch_id and n.status <> 'resolved'
                    and ((n.alert_type = 'expiry_soon' and n.threshold_days < a.threshold_days) or n.alert_type = 'expired'));

  -- Batch alerts whose batch is now empty are resolved.
  update public.alerts a set status = 'resolved', resolved_at = now()
   where a.status <> 'resolved' and a.alert_type in ('expiry_soon', 'expired')
     and not exists (select 1 from pg_temp._live l where l.id = a.batch_id);

  -- Low stock (only products with a minimum set; expired stock does not count).
  insert into public.alerts (alert_type, severity, title, message, product_id, dedupe_key)
  select 'low_stock', case when ps.sellable_qty_kg = 0 then 'critical' else 'warning' end::public.alert_severity,
         'מלאי נמוך: ' || ps.product_name,
         format('נותרו %s ק"ג כשירים למכירה (מינימום: %s ק"ג).', ps.sellable_qty_kg, ps.min_stock_kg),
         ps.product_id, 'low:' || ps.product_id
    from public.v_product_stock ps
   where ps.is_active and ps.is_low_stock
  on conflict (dedupe_key) where status <> 'resolved' do nothing;
  get diagnostics c = row_count; inserted := inserted + c;

  update public.alerts a set status = 'resolved', resolved_at = now()
   where a.status <> 'resolved' and a.alert_type = 'low_stock'
     and not exists (select 1 from public.v_product_stock ps
                     where ps.product_id = a.product_id and ps.is_active and ps.is_low_stock);

  -- Kosher certificates: expired, or expiring within the largest expiry window.
  insert into public.alerts (alert_type, severity, title, message, certificate_id, dedupe_key)
  select 'kosher_cert_invalid', 'critical', 'תעודת הכשר לא בתוקף: ' || kb.name,
         format('תעודה %s פגה ב-%s. אצוות המקושרות אליה חסומות למכירה.', kc.certificate_number, to_char(kc.valid_until, 'DD/MM/YYYY')),
         kc.id, 'cert_invalid:' || kc.id
    from public.kosher_certificates kc join public.kosher_bodies kb on kb.id = kc.kosher_body_id
   where kc.is_active and kc.valid_until < v_today
  on conflict (dedupe_key) where status <> 'resolved' do nothing;
  get diagnostics c = row_count; inserted := inserted + c;

  insert into public.alerts (alert_type, severity, title, message, certificate_id, dedupe_key)
  select 'kosher_cert_expiring', 'warning', 'תעודת הכשר עומדת לפוג: ' || kb.name,
         format('תעודה %s תפוג ב-%s (בעוד %s ימים).', kc.certificate_number, to_char(kc.valid_until, 'DD/MM/YYYY'), kc.valid_until - v_today),
         kc.id, 'cert_expiring:' || kc.id
    from public.kosher_certificates kc join public.kosher_bodies kb on kb.id = kc.kosher_body_id
   where kc.is_active and kc.valid_until >= v_today and kc.valid_until - v_today <= v_max
  on conflict (dedupe_key) where status <> 'resolved' do nothing;
  get diagnostics c = row_count; inserted := inserted + c;

  -- Certificate renewed (date extended) or deactivated → resolve its alerts.
  update public.alerts a set status = 'resolved', resolved_at = now()
   where a.status <> 'resolved' and a.alert_type in ('kosher_cert_invalid', 'kosher_cert_expiring')
     and not exists (
       select 1 from public.kosher_certificates kc
        where kc.id = a.certificate_id and kc.is_active
          and ((a.alert_type = 'kosher_cert_invalid' and kc.valid_until < v_today)
            or (a.alert_type = 'kosher_cert_expiring' and kc.valid_until >= v_today and kc.valid_until - v_today <= v_max)));

  return inserted;
end $$;
revoke execute on function public.generate_alerts() from public, anon;
grant execute on function public.generate_alerts() to authenticated;  -- "refresh now" button; idempotent

-- Runs every hour inside the database, independent of anyone opening the app.
create extension if not exists pg_cron;
select cron.schedule('meat-stock-alerts', '5 * * * *', $$select public.generate_alerts()$$);

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('product-images', 'product-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "active users read files" on storage.objects for select to authenticated
  using (bucket_id in ('documents', 'product-images') and (select public.is_active_user()));

create policy "stock staff upload documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (select public.has_role('admin', 'store_manager', 'warehouse_worker')));
create policy "managers delete documents" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (select public.has_role('admin', 'store_manager')));

create policy "managers upload images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.has_role('admin', 'store_manager')));
create policy "managers update images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.has_role('admin', 'store_manager')));
create policy "managers delete images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.has_role('admin', 'store_manager')));
