-- MEAT STOCK: audit log, reporting views and row level security

-- ---------------------------------------------------------------- audit
create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, user_id)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', null),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','app_settings','categories','kosher_levels','kosher_bodies','suppliers',
    'kosher_certificates','warehouses','location_types','storage_locations','products','batches','batch_documents'] loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- views
-- Live stock per batch per location, enriched for screens and reports.
create view public.v_stock with (security_invoker = true) as
select
  sl.batch_id,
  sl.location_id,
  sl.qty_kg,
  sl.packages,
  b.batch_number,
  b.supplier_lot,
  b.product_id,
  p.name as product_name,
  p.sku,
  p.barcode,
  p.category_id,
  c.name as category_name,
  p.sale_price_per_kg,
  b.cost_price_per_kg,
  b.supplier_id,
  s.name as supplier_name,
  b.kosher_body_id,
  kb.name as kosher_body_name,
  b.kosher_certificate_id,
  kc.certificate_number,
  kc.valid_until as certificate_valid_until,
  b.production_date,
  b.received_date,
  b.expiry_date,
  (b.expiry_date - public.store_today()) as days_to_expiry,
  loc.name as location_name,
  loc.code as location_code,
  loc.warehouse_id,
  w.name as warehouse_name,
  lt.name as location_type_name,
  round(sl.qty_kg * b.cost_price_per_kg, 2) as cost_value,
  round(sl.qty_kg * p.sale_price_per_kg, 2) as sale_value,
  (b.expiry_date >= public.store_today()
    and (kc.id is null or kc.valid_until >= public.store_today())
    and p.is_active) as is_sellable,
  case
    when b.expiry_date < public.store_today() then 'expired'
    when kc.id is not null and kc.valid_until < public.store_today() then 'cert_invalid'
    when not p.is_active then 'product_inactive'
    else 'ok'
  end as sell_block_reason
from public.stock_levels sl
join public.batches b on b.id = sl.batch_id
join public.products p on p.id = b.product_id
left join public.categories c on c.id = p.category_id
join public.suppliers s on s.id = b.supplier_id
join public.kosher_bodies kb on kb.id = b.kosher_body_id
left join public.kosher_certificates kc on kc.id = b.kosher_certificate_id
join public.storage_locations loc on loc.id = sl.location_id
join public.warehouses w on w.id = loc.warehouse_id
left join public.location_types lt on lt.id = loc.location_type_id
where sl.qty_kg > 0 or sl.packages > 0;

-- Batch totals across locations.
create view public.v_batches with (security_invoker = true) as
select
  b.*,
  p.name as product_name,
  p.sku,
  s.name as supplier_name,
  kb.name as kosher_body_name,
  kc.certificate_number,
  kc.valid_until as certificate_valid_until,
  coalesce(st.qty_kg, 0) as qty_kg,
  coalesce(st.packages, 0) as packages,
  coalesce(st.locations, '{}') as location_names,
  (b.expiry_date - public.store_today()) as days_to_expiry
from public.batches b
join public.products p on p.id = b.product_id
join public.suppliers s on s.id = b.supplier_id
join public.kosher_bodies kb on kb.id = b.kosher_body_id
left join public.kosher_certificates kc on kc.id = b.kosher_certificate_id
left join lateral (
  select sum(sl.qty_kg) as qty_kg, sum(sl.packages)::int as packages,
         array_agg(loc.name order by loc.name) filter (where sl.qty_kg > 0 or sl.packages > 0) as locations
  from public.stock_levels sl
  join public.storage_locations loc on loc.id = sl.location_id
  where sl.batch_id = b.id
) st on true;

-- Product totals (for low-stock checks and the inventory screen).
create view public.v_product_stock with (security_invoker = true) as
select
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.barcode,
  p.category_id,
  c.name as category_name,
  p.sale_price_per_kg,
  p.cost_price_per_kg,
  p.min_stock_kg,
  p.is_active,
  p.image_path,
  coalesce(sum(sl.qty_kg), 0)::numeric(12,3) as qty_kg,
  coalesce(sum(sl.packages), 0)::int as packages,
  coalesce(sum(sl.qty_kg) filter (where b.expiry_date >= public.store_today()), 0)::numeric(12,3) as sellable_qty_kg,
  min(b.expiry_date) filter (where sl.qty_kg > 0) as nearest_expiry,
  count(distinct sl.batch_id) filter (where sl.qty_kg > 0) as batch_count,
  coalesce(sum(round(sl.qty_kg * b.cost_price_per_kg, 2)), 0)::numeric(14,2) as cost_value,
  (p.min_stock_kg > 0 and coalesce(sum(sl.qty_kg) filter (where b.expiry_date >= public.store_today()), 0) < p.min_stock_kg) as is_low_stock
from public.products p
left join public.categories c on c.id = p.category_id
left join public.batches b on b.product_id = p.id
left join public.stock_levels sl on sl.batch_id = b.id
group by p.id, c.name;

-- Ledger with names (history report).
create view public.v_transactions with (security_invoker = true) as
select
  t.*,
  b.batch_number,
  b.product_id,
  p.name as product_name,
  p.sku,
  loc.name as location_name,
  pr.full_name as created_by_name
from public.inventory_transactions t
join public.batches b on b.id = t.batch_id
join public.products p on p.id = b.product_id
join public.storage_locations loc on loc.id = t.location_id
left join public.profiles pr on pr.id = t.created_by;

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array['profiles','app_settings','categories','kosher_levels','kosher_bodies','suppliers',
    'kosher_certificates','warehouses','location_types','storage_locations','products','receipts','batches',
    'batch_documents','stock_levels','inventory_transactions','stock_transfers','sales','sale_items',
    'sale_returns','sale_return_items','alerts','audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    if t <> 'audit_log' then
      -- Every active employee can read operational data.
      execute format('create policy "active users read" on public.%I for select to authenticated using ((select public.is_active_user()))', t);
    end if;
  end loop;

  -- Catalogue / master data: admin and store manager maintain it.
  foreach t in array array['categories','kosher_levels','kosher_bodies','suppliers','kosher_certificates',
    'warehouses','location_types','storage_locations','products'] loop
    execute format('create policy "managers insert" on public.%I for insert to authenticated with check ((select public.has_role(''admin'',''store_manager'')))', t);
    execute format('create policy "managers update" on public.%I for update to authenticated using ((select public.has_role(''admin'',''store_manager''))) with check ((select public.has_role(''admin'',''store_manager'')))', t);
    execute format('create policy "managers delete" on public.%I for delete to authenticated using ((select public.has_role(''admin'',''store_manager'')))', t);
  end loop;
end $$;

-- Batches are created only by receive_goods(); warehouse staff may edit notes / certificate link.
create policy "stock staff update" on public.batches for update to authenticated
  using ((select public.has_role('admin','store_manager','warehouse_worker')))
  with check ((select public.has_role('admin','store_manager','warehouse_worker')));

create policy "stock staff insert" on public.batch_documents for insert to authenticated
  with check ((select public.has_role('admin','store_manager','warehouse_worker')) and uploaded_by = (select auth.uid()));
create policy "stock staff delete" on public.batch_documents for delete to authenticated
  using ((select public.has_role('admin','store_manager','warehouse_worker')));

-- Alerts: anyone except viewers can acknowledge.
create policy "staff update" on public.alerts for update to authenticated
  using ((select public.has_role('admin','store_manager','warehouse_worker','sales_employee')))
  with check ((select public.has_role('admin','store_manager','warehouse_worker','sales_employee')));

-- Users & settings: admin only.
create policy "admin update" on public.profiles for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy "admin update" on public.app_settings for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

create policy "managers read" on public.audit_log for select to authenticated
  using ((select public.has_role('admin','store_manager')));

-- stock_levels, inventory_transactions, receipts, stock_transfers, sales, sale_items,
-- sale_returns, sale_return_items: NO write policies. They change only through the
-- SECURITY DEFINER functions in the next migration, each in a single transaction.

-- Belt and braces: the ledger cannot be written directly even if a policy is added by mistake.
revoke insert, update, delete, truncate on public.inventory_transactions, public.stock_levels from anon, authenticated;
revoke all on public.audit_log from anon;
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.store_today(), public.has_role(public.app_role[]), public.is_active_user(),
  public.current_app_role() to authenticated;
