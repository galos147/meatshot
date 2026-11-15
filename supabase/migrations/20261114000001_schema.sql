-- MEAT STOCK: core schema
-- Products are catalogue items; batches are physical deliveries; stock_levels holds
-- the live quantity of each batch in each storage location.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------- enums
create type public.app_role as enum ('admin', 'store_manager', 'warehouse_worker', 'sales_employee', 'viewer');
create type public.supplier_kind as enum ('supplier', 'factory', 'both');
create type public.txn_type as enum (
  'receipt',        -- goods received into a batch
  'sale',           -- sold (negative)
  'sale_cancel',    -- whole sale cancelled, goods back to stock
  'sale_return',    -- customer return put back to stock
  'transfer_out',
  'transfer_in',
  'adjustment',     -- stock count correction (+/-)
  'waste',          -- spoilage / disposal (negative)
  'reversal'        -- documented reversal of a previous transaction
);
create type public.sale_status as enum ('completed', 'cancelled');
create type public.alert_type as enum ('expiry_soon', 'expired', 'low_stock', 'kosher_cert_expiring', 'kosher_cert_invalid');
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.alert_status as enum ('open', 'acknowledged', 'resolved');

-- ---------------------------------------------------------------- helpers
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  email text,
  phone text,
  role public.app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'חנות המפעל',
  timezone text not null default 'Asia/Jerusalem',
  expiry_alert_days int[] not null default '{14,7,3}'
    check (array_length(expiry_alert_days, 1) between 1 and 10 and 0 < all (expiry_alert_days)),
  default_min_stock_kg numeric(12,3) not null default 0 check (default_min_stock_kg >= 0),
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

-- Business date in the store's timezone (sales, expiry and alerts all use it).
create function public.store_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone coalesce((select timezone from public.app_settings where id = 1), 'Asia/Jerusalem'))::date
$$;

create function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create function public.has_role(variadic roles public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.role = any (roles) from public.profiles p where p.id = auth.uid() and p.is_active),
    false)
$$;

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active)
$$;

-- New auth user -> profile. Role comes from app_metadata (only settable server-side).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1), 'משתמש'),
    new.email,
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'viewer')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The role lives in app_metadata (writable only with the service key). Auth writes
-- app_metadata after the insert, and admins change roles through it, so keep in sync.
create function public.sync_user_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.raw_app_meta_data ->> 'role') is not null then
    update public.profiles
       set role = (new.raw_app_meta_data ->> 'role')::public.app_role
     where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_role_changed after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data ->> 'role' is distinct from new.raw_app_meta_data ->> 'role')
  execute function public.sync_user_role();

-- ---------------------------------------------------------------- master data
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  description text,
  color text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kosher_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  rank int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kosher_bodies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  level_id uuid references public.kosher_levels (id),
  contact text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  kind public.supplier_kind not null default 'supplier',
  business_number text,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kosher_certificates (
  id uuid primary key default gen_random_uuid(),
  kosher_body_id uuid not null references public.kosher_bodies (id),
  supplier_id uuid references public.suppliers (id),
  certificate_number text not null check (length(trim(certificate_number)) > 0),
  valid_from date,
  valid_until date not null,
  document_path text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_from is null or valid_from <= valid_until),
  unique (kosher_body_id, certificate_number)
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  code text unique,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.location_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id),
  location_type_id uuid references public.location_types (id),
  name text not null check (length(trim(name)) > 0),
  code text not null check (length(trim(code)) > 0),
  zone text,
  shelf text,
  temp_min numeric(5,1),
  temp_max numeric(5,1),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, code),
  check (temp_min is null or temp_max is null or temp_min <= temp_max)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  sku text not null unique check (length(trim(sku)) > 0),
  barcode text unique,
  category_id uuid references public.categories (id),
  description text,
  image_path text,
  sale_price_per_kg numeric(12,2) not null check (sale_price_per_kg >= 0),
  cost_price_per_kg numeric(12,2) not null default 0 check (cost_price_per_kg >= 0),
  min_stock_kg numeric(12,3) not null default 0 check (min_stock_kg >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_name_trgm on public.products using gin (name extensions.gin_trgm_ops);
create index products_category_idx on public.products (category_id);

-- ---------------------------------------------------------------- receiving & batches
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number bigint generated always as identity unique,
  supplier_id uuid not null references public.suppliers (id),
  delivery_note_number text,
  received_date date not null,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index receipts_supplier_idx on public.receipts (supplier_id);
create index receipts_date_idx on public.receipts (received_date desc);

create sequence public.batch_number_seq;

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique,
  supplier_lot text,
  product_id uuid not null references public.products (id),
  supplier_id uuid not null references public.suppliers (id),
  kosher_body_id uuid not null references public.kosher_bodies (id),
  kosher_certificate_id uuid references public.kosher_certificates (id),
  receipt_id uuid references public.receipts (id),
  production_date date,
  received_date date not null,
  expiry_date date not null,
  initial_qty_kg numeric(12,3) not null check (initial_qty_kg > 0),
  initial_packages int not null default 0 check (initial_packages >= 0),
  cost_price_per_kg numeric(12,2) not null check (cost_price_per_kg >= 0),
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (production_date is null or production_date <= expiry_date)
);
create index batches_product_expiry_idx on public.batches (product_id, expiry_date);
create index batches_kosher_idx on public.batches (kosher_body_id);
create index batches_supplier_idx on public.batches (supplier_id);
create index batches_receipt_idx on public.batches (receipt_id);
create index batches_expiry_idx on public.batches (expiry_date);

-- A batch is one delivery with one expiry date and one kosher certification.
-- Those identity fields can never change, so batches can never be "merged".
create function public.batches_guard_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.product_id is distinct from old.product_id
     or new.kosher_body_id is distinct from old.kosher_body_id
     or new.expiry_date is distinct from old.expiry_date
     or new.batch_number is distinct from old.batch_number
     or new.initial_qty_kg is distinct from old.initial_qty_kg
     or new.initial_packages is distinct from old.initial_packages
     or new.supplier_id is distinct from old.supplier_id
     or new.receipt_id is distinct from old.receipt_id
     or new.received_date is distinct from old.received_date
     or new.cost_price_per_kg is distinct from old.cost_price_per_kg
     or new.created_by is distinct from old.created_by then
    raise exception 'לא ניתן לשנות מוצר, הכשר, תאריך תפוגה או כמות של אצווה קיימת'
      using errcode = 'P0001', hint = 'BATCH_IMMUTABLE';
  end if;
  return new;
end $$;
create trigger batches_guard_immutable before update on public.batches
  for each row execute function public.batches_guard_immutable();

-- The certificate attached to a batch must belong to the batch's kosher body.
create function public.batches_check_certificate() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kosher_certificate_id is not null and not exists (
    select 1 from public.kosher_certificates c
    where c.id = new.kosher_certificate_id and c.kosher_body_id = new.kosher_body_id
  ) then
    raise exception 'תעודת ההכשר אינה שייכת לגוף ההכשר של האצווה'
      using errcode = 'P0001', hint = 'CERT_MISMATCH';
  end if;
  return new;
end $$;
create trigger batches_check_certificate before insert or update on public.batches
  for each row execute function public.batches_check_certificate();

create table public.batch_documents (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  doc_type text not null default 'other',
  uploaded_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index batch_documents_batch_idx on public.batch_documents (batch_id);

-- ---------------------------------------------------------------- stock
create table public.stock_levels (
  batch_id uuid not null references public.batches (id),
  location_id uuid not null references public.storage_locations (id),
  qty_kg numeric(12,3) not null default 0 check (qty_kg >= 0),
  packages int not null default 0 check (packages >= 0),
  updated_at timestamptz not null default now(),
  primary key (batch_id, location_id)
);
create index stock_levels_location_idx on public.stock_levels (location_id);
create index stock_levels_positive_idx on public.stock_levels (batch_id) where qty_kg > 0;

create table public.inventory_transactions (
  id bigint generated always as identity primary key,
  txn_type public.txn_type not null,
  batch_id uuid not null references public.batches (id),
  location_id uuid not null references public.storage_locations (id),
  qty_kg_delta numeric(12,3) not null,
  packages_delta int not null default 0,
  ref_table text,
  ref_id uuid,
  reverses_txn_id bigint unique references public.inventory_transactions (id),
  reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (qty_kg_delta <> 0 or packages_delta <> 0)
);
create index inv_txn_batch_idx on public.inventory_transactions (batch_id, created_at desc);
create index inv_txn_location_idx on public.inventory_transactions (location_id, created_at desc);
create index inv_txn_created_idx on public.inventory_transactions (created_at desc);
create index inv_txn_ref_idx on public.inventory_transactions (ref_table, ref_id);
create index inv_txn_type_idx on public.inventory_transactions (txn_type, created_at desc);

-- Transactions are an immutable ledger.
create function public.inventory_transactions_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'אסור לשנות או למחוק תנועות מלאי. יש לבצע תנועת ביטול.'
    using errcode = 'P0001', hint = 'LEDGER_IMMUTABLE';
end $$;
create trigger inventory_transactions_no_update before update or delete on public.inventory_transactions
  for each row execute function public.inventory_transactions_immutable();
create trigger inventory_transactions_no_truncate before truncate on public.inventory_transactions
  for each statement execute function public.inventory_transactions_immutable();

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number bigint generated always as identity unique,
  batch_id uuid not null references public.batches (id),
  from_location_id uuid not null references public.storage_locations (id),
  to_location_id uuid not null references public.storage_locations (id),
  qty_kg numeric(12,3) not null check (qty_kg >= 0),
  packages int not null default 0 check (packages >= 0),
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (from_location_id <> to_location_id),
  check (qty_kg > 0 or packages > 0)
);
create index stock_transfers_batch_idx on public.stock_transfers (batch_id);
create index stock_transfers_created_idx on public.stock_transfers (created_at desc);

-- ---------------------------------------------------------------- sales
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number bigint generated always as identity unique,
  idempotency_key uuid not null unique,
  kosher_body_ids uuid[] not null default '{}',
  subtotal numeric(12,2) not null default 0,
  items_discount numeric(12,2) not null default 0,
  sale_discount numeric(12,2) not null default 0 check (sale_discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  total_cost numeric(12,2) not null default 0,
  status public.sale_status not null default 'completed',
  customer_name text,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  cancelled_by uuid references public.profiles (id),
  cancelled_at timestamptz,
  cancel_reason text
);
create index sales_created_idx on public.sales (created_at desc);
create index sales_status_idx on public.sales (status, created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id),
  line_no int not null,
  product_id uuid not null references public.products (id),
  batch_id uuid not null references public.batches (id),
  location_id uuid not null references public.storage_locations (id),
  qty_kg numeric(12,3) not null check (qty_kg > 0),
  packages int not null default 0 check (packages >= 0),
  price_per_kg numeric(12,2) not null check (price_per_kg >= 0),
  cost_per_kg numeric(12,2) not null check (cost_per_kg >= 0),
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  returned_qty_kg numeric(12,3) not null default 0 check (returned_qty_kg >= 0),
  returned_packages int not null default 0 check (returned_packages >= 0),
  unique (sale_id, line_no),
  check (discount_amount <= gross_amount),
  check (returned_qty_kg <= qty_kg),
  check (returned_packages <= packages)
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (product_id);
create index sale_items_batch_idx on public.sale_items (batch_id);

create table public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  return_number bigint generated always as identity unique,
  sale_id uuid not null references public.sales (id),
  reason text not null check (length(trim(reason)) > 0),
  refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index sale_returns_sale_idx on public.sale_returns (sale_id);

create table public.sale_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.sale_returns (id),
  sale_item_id uuid not null references public.sale_items (id),
  qty_kg numeric(12,3) not null check (qty_kg >= 0),
  packages int not null default 0 check (packages >= 0),
  restocked boolean not null,
  location_id uuid references public.storage_locations (id),
  refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),
  check (qty_kg > 0 or packages > 0),
  check (not restocked or location_id is not null)
);
create index sale_return_items_return_idx on public.sale_return_items (return_id);

-- ---------------------------------------------------------------- alerts & audit
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type public.alert_type not null,
  severity public.alert_severity not null,
  title text not null,
  message text not null,
  batch_id uuid references public.batches (id),
  product_id uuid references public.products (id),
  certificate_id uuid references public.kosher_certificates (id),
  threshold_days int,
  dedupe_key text not null,
  status public.alert_status not null default 'open',
  created_at timestamptz not null default now(),
  acknowledged_by uuid references public.profiles (id),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);
-- One live alert per subject: a resolved alert may be raised again later.
create unique index alerts_dedupe_live_idx on public.alerts (dedupe_key) where status <> 'resolved';
create index alerts_status_idx on public.alerts (status, severity, created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index audit_log_table_idx on public.audit_log (table_name, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','app_settings','categories','kosher_levels','kosher_bodies','suppliers',
    'kosher_certificates','warehouses','location_types','storage_locations','products','batches'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
