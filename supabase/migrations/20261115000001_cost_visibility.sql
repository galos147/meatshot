-- MEAT STOCK: cost prices and margins are visible to admin / store_manager only.
--
-- Until now the screens hid cost data from other roles, but the "active users read"
-- policies let any signed-in employee read whole rows straight from the API. Row level
-- security cannot hide single columns, and every employee shares the same database role
-- (authenticated), so:
--   1. nobody reads the four cost columns from the base tables through the API;
--   2. the stock views blank them out unless the caller is admin / store_manager;
--   3. three small finance views return cost rows to admin / store_manager only.
-- The SECURITY DEFINER functions (receive_goods, create_sale, ...) are unaffected.

-- ---------------------------------------------------------------- 1. column privileges
-- A column cannot be revoked while the whole table is granted, so swap the table-level
-- SELECT for a grant on every column except the cost one.
-- NOTE: a column added to these tables later must be granted explicitly:
--   grant select (new_column) on public.<table> to authenticated;
do $$
declare
  r record;
  cols text;
begin
  for r in
    select * from (values
      ('products', 'cost_price_per_kg'),
      ('batches', 'cost_price_per_kg'),
      ('sales', 'total_cost'),
      ('sale_items', 'cost_per_kg')) as t(tbl, cost_col)
  loop
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into cols
    from pg_catalog.pg_attribute a
    where a.attrelid = format('public.%I', r.tbl)::regclass
      and a.attnum > 0 and not a.attisdropped and a.attname <> r.cost_col;
    execute format('revoke select on public.%I from authenticated, anon', r.tbl);
    execute format('grant select (%s) on public.%I to authenticated', cols, r.tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------- 2. stock views
-- These now run with the owner's rights (the caller can no longer read the cost columns
-- they are built on), so each one repeats the rule the table policies enforce - active
-- employees only - and blanks the cost fields for everyone but admin / store_manager.
--
-- API requests run as the database role "authenticated" (or "anon"); those are judged by
-- their employee profile. Anything else is trusted server-side code that row level
-- security never applied to: the service key, and the SECURITY DEFINER functions
-- (generate_alerts reads v_product_stock while running as its owner).
-- Both helpers are SECURITY INVOKER on purpose: current_user must be the caller's role.
create function public.can_read_stock() returns boolean
language sql stable security invoker set search_path = '' as $$
  select current_user not in ('authenticated', 'anon') or public.is_active_user()
$$;

create function public.can_see_costs() returns boolean
language sql stable security invoker set search_path = '' as $$
  select current_user not in ('authenticated', 'anon') or public.has_role('admin', 'store_manager')
$$;

revoke execute on function public.can_read_stock(), public.can_see_costs() from public, anon;
grant execute on function public.can_read_stock(), public.can_see_costs() to authenticated, service_role;

create or replace view public.v_stock with (security_invoker = false) as
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
  (case when (select public.can_see_costs()) then b.cost_price_per_kg end)::numeric(12,2) as cost_price_per_kg,
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
  case when (select public.can_see_costs()) then round(sl.qty_kg * b.cost_price_per_kg, 2) end as cost_value,
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
where (select public.can_read_stock())
  and (sl.qty_kg > 0 or sl.packages > 0);

create or replace view public.v_batches with (security_invoker = false) as
select
  b.id,
  b.batch_number,
  b.supplier_lot,
  b.product_id,
  b.supplier_id,
  b.kosher_body_id,
  b.kosher_certificate_id,
  b.receipt_id,
  b.production_date,
  b.received_date,
  b.expiry_date,
  b.initial_qty_kg,
  b.initial_packages,
  (case when (select public.can_see_costs()) then b.cost_price_per_kg end)::numeric(12,2) as cost_price_per_kg,
  b.notes,
  b.created_by,
  b.created_at,
  b.updated_at,
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
) st on true
where (select public.can_read_stock());

create or replace view public.v_product_stock with (security_invoker = false) as
select
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.barcode,
  p.category_id,
  c.name as category_name,
  p.sale_price_per_kg,
  (case when (select public.can_see_costs()) then p.cost_price_per_kg end)::numeric(12,2) as cost_price_per_kg,
  p.min_stock_kg,
  p.is_active,
  p.image_path,
  coalesce(sum(sl.qty_kg), 0)::numeric(12,3) as qty_kg,
  coalesce(sum(sl.packages), 0)::int as packages,
  coalesce(sum(sl.qty_kg) filter (where b.expiry_date >= public.store_today()), 0)::numeric(12,3) as sellable_qty_kg,
  min(b.expiry_date) filter (where sl.qty_kg > 0) as nearest_expiry,
  count(distinct sl.batch_id) filter (where sl.qty_kg > 0) as batch_count,
  (case when (select public.can_see_costs())
        then coalesce(sum(round(sl.qty_kg * b.cost_price_per_kg, 2)), 0) end)::numeric(14,2) as cost_value,
  (p.min_stock_kg > 0 and coalesce(sum(sl.qty_kg) filter (where b.expiry_date >= public.store_today()), 0) < p.min_stock_kg) as is_low_stock
from public.products p
left join public.categories c on c.id = p.category_id
left join public.batches b on b.product_id = p.id
left join public.stock_levels sl on sl.batch_id = b.id
where (select public.can_read_stock())
group by p.id, c.name;

-- ---------------------------------------------------------------- 3. finance views
-- The only way to read cost from the API. No rows unless the caller is an active
-- admin / store_manager (has_role checks both) or trusted server-side code.
create view public.v_product_costs with (security_invoker = false) as
select p.id as product_id, p.cost_price_per_kg
from public.products p
where (select public.can_see_costs());

create view public.v_sale_costs with (security_invoker = false) as
select s.id as sale_id, s.created_at, s.status, s.total_cost
from public.sales s
where (select public.can_see_costs());

create view public.v_sale_item_costs with (security_invoker = false) as
select i.id as sale_item_id, i.sale_id, s.created_at as sold_at, i.cost_per_kg
from public.sale_items i
join public.sales s on s.id = i.sale_id
where (select public.can_see_costs());

-- Owner-rights views must be read-only: a simple one is auto-updatable, and a write
-- through it would skip the table policies. New objects also get default grants.
revoke all on public.v_stock, public.v_batches, public.v_product_stock,
  public.v_product_costs, public.v_sale_costs, public.v_sale_item_costs from anon, authenticated, public;
grant select on public.v_stock, public.v_batches, public.v_product_stock,
  public.v_product_costs, public.v_sale_costs, public.v_sale_item_costs to authenticated;
