-- MEAT STOCK: inventory operations.
-- Every stock change goes through one of these functions. Each runs as a single
-- database transaction, locks the stock rows it touches (FOR UPDATE, in a fixed
-- order to avoid deadlocks) and writes a ledger row per change.

-- ---------------------------------------------------------------- internals
create function public._require_role(variadic roles public.app_role[]) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(variadic roles) then
    raise exception 'אין לך הרשאה לבצע פעולה זו' using errcode = '42501', hint = 'FORBIDDEN';
  end if;
  return uid;
end $$;

-- Applies a delta to one stock row (row must already be locked by the caller or be new)
-- and writes the matching ledger row. Returns the ledger id.
create function public._apply_stock_delta(
  p_type public.txn_type, p_batch uuid, p_location uuid,
  p_qty numeric, p_packages int, p_user uuid,
  p_ref_table text default null, p_ref_id uuid default null,
  p_reason text default null, p_reverses bigint default null
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  cur public.stock_levels%rowtype;
  txn_id bigint;
  bnum text;
begin
  p_qty := round(coalesce(p_qty, 0), 3);
  p_packages := coalesce(p_packages, 0);
  if p_qty = 0 and p_packages = 0 then
    return null;
  end if;

  select * into cur from public.stock_levels
   where batch_id = p_batch and location_id = p_location for update;

  if not found then
    if p_qty < 0 or p_packages < 0 then
      raise exception 'אין מלאי של האצווה במיקום שנבחר' using errcode = 'P0001', hint = 'NO_STOCK';
    end if;
    insert into public.stock_levels (batch_id, location_id, qty_kg, packages)
    values (p_batch, p_location, p_qty, p_packages);
  else
    if cur.qty_kg + p_qty < 0 or cur.packages + p_packages < 0 then
      select batch_number into bnum from public.batches where id = p_batch;
      raise exception 'אין מספיק מלאי באצווה %: זמין % ק"ג / % אריזות, נדרש % ק"ג / % אריזות',
        bnum, cur.qty_kg, cur.packages, abs(least(p_qty, 0)), abs(least(p_packages, 0))
        using errcode = 'P0001', hint = 'INSUFFICIENT_STOCK';
    end if;
    update public.stock_levels
       set qty_kg = cur.qty_kg + p_qty, packages = cur.packages + p_packages, updated_at = now()
     where batch_id = p_batch and location_id = p_location;
  end if;

  insert into public.inventory_transactions
    (txn_type, batch_id, location_id, qty_kg_delta, packages_delta, ref_table, ref_id, reason, reverses_txn_id, created_by)
  values (p_type, p_batch, p_location, p_qty, p_packages, p_ref_table, p_ref_id, p_reason, p_reverses, p_user)
  returning id into txn_id;
  return txn_id;
end $$;
revoke execute on function public._apply_stock_delta(public.txn_type, uuid, uuid, numeric, int, uuid, text, uuid, text, bigint) from public, anon, authenticated;
revoke execute on function public._require_role(public.app_role[]) from public, anon, authenticated;

-- Locks stock rows in a deterministic order (batch, location) to prevent deadlocks
-- when two operations touch the same rows.
create function public._lock_stock(p_keys jsonb) returns void
language sql security definer set search_path = '' as $$
  select 1 from public.stock_levels sl
  where (sl.batch_id, sl.location_id) in (
    select (k ->> 'batch_id')::uuid, (k ->> 'location_id')::uuid from jsonb_array_elements(p_keys) k
  )
  order by sl.batch_id, sl.location_id
  for update
$$;
revoke execute on function public._lock_stock(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- receiving
-- p_receipt: { supplier_id, delivery_note_number?, received_date?, notes?,
--   lines: [{ product_id, kosher_body_id, kosher_certificate_id?, supplier_lot?, production_date?,
--             expiry_date, qty_kg, packages?, cost_price_per_kg?, location_id, notes? }] }
-- Every line becomes its own batch: batches are never merged.
create function public.receive_goods(p_receipt jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_role('admin', 'store_manager', 'warehouse_worker');
  rid uuid;
  line jsonb;
  bid uuid;
  prod public.products%rowtype;
  v_received date := coalesce((p_receipt ->> 'received_date')::date, public.store_today());
  v_expiry date;
  v_qty numeric;
  v_packages int;
  v_cost numeric;
  n int := 0;
begin
  if p_receipt -> 'lines' is null or jsonb_array_length(p_receipt -> 'lines') = 0 then
    raise exception 'יש להוסיף לפחות שורה אחת לקבלה' using errcode = 'P0001', hint = 'EMPTY';
  end if;
  if not exists (select 1 from public.suppliers where id = (p_receipt ->> 'supplier_id')::uuid and is_active) then
    raise exception 'ספק לא נמצא או אינו פעיל' using errcode = 'P0001', hint = 'SUPPLIER';
  end if;
  if v_received > public.store_today() then
    raise exception 'תאריך הקבלה לא יכול להיות עתידי' using errcode = 'P0001', hint = 'DATE';
  end if;

  insert into public.receipts (supplier_id, delivery_note_number, received_date, notes, created_by)
  values ((p_receipt ->> 'supplier_id')::uuid, nullif(p_receipt ->> 'delivery_note_number', ''),
          v_received, nullif(p_receipt ->> 'notes', ''), uid)
  returning id into rid;

  for line in select * from jsonb_array_elements(p_receipt -> 'lines') loop
    n := n + 1;
    select * into prod from public.products where id = (line ->> 'product_id')::uuid;
    if not found or not prod.is_active then
      raise exception 'שורה %: מוצר לא נמצא או אינו פעיל', n using errcode = 'P0001', hint = 'PRODUCT';
    end if;
    v_expiry := (line ->> 'expiry_date')::date;
    v_qty := round((line ->> 'qty_kg')::numeric, 3);
    v_packages := coalesce((line ->> 'packages')::int, 0);
    v_cost := coalesce((line ->> 'cost_price_per_kg')::numeric, prod.cost_price_per_kg);
    if v_expiry is null or v_expiry < v_received then
      raise exception 'שורה %: תאריך התפוגה חייב להיות אחרי תאריך הקבלה', n using errcode = 'P0001', hint = 'EXPIRY';
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'שורה %: הכמות חייבת להיות גדולה מאפס', n using errcode = 'P0001', hint = 'QTY';
    end if;
    if v_packages < 0 then
      raise exception 'שורה %: מספר אריזות לא תקין', n using errcode = 'P0001', hint = 'QTY';
    end if;
    if not exists (select 1 from public.kosher_bodies where id = (line ->> 'kosher_body_id')::uuid and is_active) then
      raise exception 'שורה %: גוף הכשר לא נמצא או אינו פעיל', n using errcode = 'P0001', hint = 'KOSHER';
    end if;
    if not exists (select 1 from public.storage_locations where id = (line ->> 'location_id')::uuid and is_active) then
      raise exception 'שורה %: מיקום אחסון לא נמצא או אינו פעיל', n using errcode = 'P0001', hint = 'LOCATION';
    end if;

    insert into public.batches (
      batch_number, supplier_lot, product_id, supplier_id, kosher_body_id, kosher_certificate_id, receipt_id,
      production_date, received_date, expiry_date, initial_qty_kg, initial_packages, cost_price_per_kg, notes, created_by)
    values (
      'B' || to_char(v_received, 'YYMMDD') || '-' || lpad(nextval('public.batch_number_seq')::text, 4, '0'),
      nullif(line ->> 'supplier_lot', ''), prod.id, (p_receipt ->> 'supplier_id')::uuid,
      (line ->> 'kosher_body_id')::uuid, nullif(line ->> 'kosher_certificate_id', '')::uuid, rid,
      nullif(line ->> 'production_date', '')::date, v_received, v_expiry, v_qty, v_packages, v_cost,
      nullif(line ->> 'notes', ''), uid)
    returning id into bid;

    perform public._apply_stock_delta('receipt', bid, (line ->> 'location_id')::uuid, v_qty, v_packages, uid,
      'receipts', rid, null, null);
  end loop;

  return rid;
end $$;

-- ---------------------------------------------------------------- sellable stock (FEFO)
-- Stock rows for a product, best candidate first: sellable rows by nearest expiry.
create function public.available_stock(p_product_id uuid, p_kosher_body_ids uuid[] default '{}')
returns table (
  batch_id uuid, location_id uuid, batch_number text, location_name text, warehouse_name text,
  kosher_body_id uuid, kosher_body_name text, expiry_date date, days_to_expiry int,
  qty_kg numeric, packages int, sale_price_per_kg numeric, is_sellable boolean, block_reason text
)
language sql stable security invoker set search_path = '' as $$
  select v.batch_id, v.location_id, v.batch_number, v.location_name, v.warehouse_name,
         v.kosher_body_id, v.kosher_body_name, v.expiry_date, v.days_to_expiry,
         v.qty_kg, v.packages, v.sale_price_per_kg,
         (v.is_sellable and (cardinality(p_kosher_body_ids) = 0 or v.kosher_body_id = any (p_kosher_body_ids))) as is_sellable,
         case
           when v.sell_block_reason <> 'ok' then v.sell_block_reason
           when cardinality(p_kosher_body_ids) > 0 and not (v.kosher_body_id = any (p_kosher_body_ids)) then 'kosher_mismatch'
           else null
         end as block_reason
  from public.v_stock v
  where v.product_id = p_product_id and v.qty_kg > 0
  order by 13 desc, v.expiry_date, v.received_date, v.batch_number
$$;
grant execute on function public.available_stock(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------- sales
-- p_items: [{ batch_id, location_id, qty_kg, packages?, discount_amount? }]
-- Idempotent: calling again with the same key returns the original sale id.
create function public.create_sale(
  p_idempotency_key uuid,
  p_items jsonb,
  p_kosher_body_ids uuid[] default '{}',
  p_sale_discount numeric default 0,
  p_customer_name text default null,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_role('admin', 'store_manager', 'sales_employee');
  sid uuid;
  item jsonb;
  n int := 0;
  st record;
  v_qty numeric;
  v_pk int;
  v_gross numeric;
  v_disc numeric;
  v_items_total numeric := 0;
  v_subtotal numeric := 0;
  v_items_disc numeric := 0;
  v_cost numeric := 0;
  v_item_id uuid;
  v_today date := public.store_today();
begin
  if p_idempotency_key is null then
    raise exception 'חסר מזהה מכירה' using errcode = 'P0001', hint = 'IDEMPOTENCY';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'העגלה ריקה' using errcode = 'P0001', hint = 'EMPTY';
  end if;
  p_kosher_body_ids := coalesce(p_kosher_body_ids, '{}');
  p_sale_discount := round(coalesce(p_sale_discount, 0), 2);
  if p_sale_discount < 0 then
    raise exception 'הנחה לא יכולה להיות שלילית' using errcode = 'P0001', hint = 'DISCOUNT';
  end if;

  -- Claim the idempotency key first. A concurrent duplicate waits here on the unique
  -- index and then returns the sale that won.
  insert into public.sales (idempotency_key, kosher_body_ids, customer_name, notes, created_by, sale_discount)
  values (p_idempotency_key, p_kosher_body_ids, nullif(trim(p_customer_name), ''), nullif(trim(p_notes), ''), uid, p_sale_discount)
  on conflict (idempotency_key) do nothing
  returning id into sid;
  if sid is null then
    select id into sid from public.sales where idempotency_key = p_idempotency_key;
    return sid;
  end if;

  perform public._lock_stock(p_items);

  for item in select * from jsonb_array_elements(p_items) loop
    n := n + 1;
    v_qty := round((item ->> 'qty_kg')::numeric, 3);
    v_pk := coalesce((item ->> 'packages')::int, 0);
    if v_qty is null or v_qty <= 0 then
      raise exception 'שורה %: יש להזין משקל גדול מאפס', n using errcode = 'P0001', hint = 'QTY';
    end if;
    if v_pk < 0 then
      raise exception 'שורה %: מספר אריזות לא תקין', n using errcode = 'P0001', hint = 'QTY';
    end if;

    select b.id, b.batch_number, b.product_id, b.kosher_body_id, b.expiry_date, b.cost_price_per_kg,
           p.name as product_name, p.sale_price_per_kg, p.is_active,
           kc.valid_until as cert_valid_until, kb.name as kosher_name,
           sl.qty_kg as avail_kg, sl.packages as avail_pk
      into st
      from public.stock_levels sl
      join public.batches b on b.id = sl.batch_id
      join public.products p on p.id = b.product_id
      join public.kosher_bodies kb on kb.id = b.kosher_body_id
      left join public.kosher_certificates kc on kc.id = b.kosher_certificate_id
     where sl.batch_id = (item ->> 'batch_id')::uuid and sl.location_id = (item ->> 'location_id')::uuid;

    if not found then
      raise exception 'שורה %: האצווה לא נמצאה במיקום שנבחר', n using errcode = 'P0001', hint = 'NO_STOCK';
    end if;
    if not st.is_active then
      raise exception 'המוצר "%" אינו פעיל', st.product_name using errcode = 'P0001', hint = 'PRODUCT';
    end if;
    if st.expiry_date < v_today then
      raise exception 'אצווה % של "%" פג תוקפה (%). אסור למכור.', st.batch_number, st.product_name, to_char(st.expiry_date, 'DD/MM/YYYY')
        using errcode = 'P0001', hint = 'EXPIRED';
    end if;
    if st.cert_valid_until is not null and st.cert_valid_until < v_today then
      raise exception 'תעודת ההכשר של אצווה % אינה בתוקף. אסור למכור.', st.batch_number
        using errcode = 'P0001', hint = 'CERT_INVALID';
    end if;
    if cardinality(p_kosher_body_ids) > 0 and not (st.kosher_body_id = any (p_kosher_body_ids)) then
      raise exception 'אצווה % (הכשר: %) אינה תואמת את דרישת ההכשר של המכירה', st.batch_number, st.kosher_name
        using errcode = 'P0001', hint = 'KOSHER_MISMATCH';
    end if;

    v_gross := round(v_qty * st.sale_price_per_kg, 2);
    v_disc := round(coalesce((item ->> 'discount_amount')::numeric, 0), 2);
    if v_disc < 0 or v_disc > v_gross then
      raise exception 'שורה %: ההנחה חייבת להיות בין 0 למחיר השורה', n using errcode = 'P0001', hint = 'DISCOUNT';
    end if;
    -- Selling the last gram empties the row's packages too.
    if v_qty = st.avail_kg and v_pk < st.avail_pk then
      v_pk := st.avail_pk;
    end if;

    insert into public.sale_items (sale_id, line_no, product_id, batch_id, location_id, qty_kg, packages,
      price_per_kg, cost_per_kg, gross_amount, discount_amount, line_total)
    values (sid, n, st.product_id, st.id, (item ->> 'location_id')::uuid, v_qty, v_pk,
      st.sale_price_per_kg, st.cost_price_per_kg, v_gross, v_disc, v_gross - v_disc)
    returning id into v_item_id;

    perform public._apply_stock_delta('sale', st.id, (item ->> 'location_id')::uuid, -v_qty, -v_pk, uid,
      'sale_items', v_item_id, null, null);

    v_subtotal := v_subtotal + v_gross;
    v_items_disc := v_items_disc + v_disc;
    v_items_total := v_items_total + (v_gross - v_disc);
    v_cost := v_cost + round(v_qty * st.cost_price_per_kg, 2);
  end loop;

  if p_sale_discount > v_items_total then
    raise exception 'הנחת המכירה גדולה מסכום המכירה' using errcode = 'P0001', hint = 'DISCOUNT';
  end if;

  update public.sales
     set subtotal = v_subtotal, items_discount = v_items_disc,
         total = v_items_total - p_sale_discount, total_cost = v_cost
   where id = sid;

  return sid;
end $$;

-- Cancels a whole sale: everything not already returned goes back to its original location.
create function public.cancel_sale(p_sale_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_role('admin', 'store_manager');
  s public.sales%rowtype;
  it public.sale_items%rowtype;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'יש לציין סיבת ביטול' using errcode = 'P0001', hint = 'REASON';
  end if;
  select * into s from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'המכירה לא נמצאה' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  if s.status = 'cancelled' then
    raise exception 'המכירה כבר בוטלה' using errcode = 'P0001', hint = 'ALREADY_CANCELLED';
  end if;

  perform public._lock_stock((select jsonb_agg(jsonb_build_object('batch_id', batch_id, 'location_id', location_id))
                               from public.sale_items where sale_id = p_sale_id));

  for it in select * from public.sale_items where sale_id = p_sale_id order by line_no for update loop
    perform public._apply_stock_delta('sale_cancel', it.batch_id, it.location_id,
      it.qty_kg - it.returned_qty_kg, it.packages - it.returned_packages, uid,
      'sale_items', it.id, trim(p_reason), null);
  end loop;

  update public.sales
     set status = 'cancelled', cancelled_by = uid, cancelled_at = now(), cancel_reason = trim(p_reason)
   where id = p_sale_id;
end $$;

-- Partial / full customer return.
-- p_items: [{ sale_item_id, qty_kg, packages?, restock: bool, location_id? }]
-- restock=false records the return without putting the goods back (e.g. spoiled).
create function public.return_sale_items(p_sale_id uuid, p_items jsonb, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_role('admin', 'store_manager');
  s public.sales%rowtype;
  it public.sale_items%rowtype;
  item jsonb;
  ret_id uuid;
  v_qty numeric;
  v_pk int;
  v_loc uuid;
  v_restock boolean;
  v_refund numeric;
  v_total_refund numeric := 0;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'יש לציין סיבת החזרה' using errcode = 'P0001', hint = 'REASON';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'לא נבחרו פריטים להחזרה' using errcode = 'P0001', hint = 'EMPTY';
  end if;
  select * into s from public.sales where id = p_sale_id for update;
  if not found or s.status <> 'completed' then
    raise exception 'ניתן להחזיר רק ממכירה פעילה' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;

  insert into public.sale_returns (sale_id, reason, created_by) values (p_sale_id, trim(p_reason), uid)
  returning id into ret_id;

  for item in select * from jsonb_array_elements(p_items) loop
    select * into it from public.sale_items
     where id = (item ->> 'sale_item_id')::uuid and sale_id = p_sale_id for update;
    if not found then
      raise exception 'פריט לא שייך למכירה' using errcode = 'P0001', hint = 'NOT_FOUND';
    end if;
    v_qty := round(coalesce((item ->> 'qty_kg')::numeric, 0), 3);
    v_pk := coalesce((item ->> 'packages')::int, 0);
    v_restock := coalesce((item ->> 'restock')::boolean, true);
    v_loc := coalesce(nullif(item ->> 'location_id', '')::uuid, it.location_id);
    if v_qty < 0 or v_pk < 0 or (v_qty = 0 and v_pk = 0) then
      raise exception 'כמות החזרה לא תקינה' using errcode = 'P0001', hint = 'QTY';
    end if;
    if it.returned_qty_kg + v_qty > it.qty_kg or it.returned_packages + v_pk > it.packages then
      raise exception 'לא ניתן להחזיר יותר ממה שנמכר (נמכר % ק"ג, הוחזר כבר % ק"ג)', it.qty_kg, it.returned_qty_kg
        using errcode = 'P0001', hint = 'RETURN_EXCEEDS';
    end if;

    -- Refund proportional to the weight returned, net of the line discount.
    v_refund := case when it.qty_kg = 0 then 0 else round(it.line_total * v_qty / it.qty_kg, 2) end;
    v_total_refund := v_total_refund + v_refund;

    insert into public.sale_return_items (return_id, sale_item_id, qty_kg, packages, restocked, location_id, refund_amount)
    values (ret_id, it.id, v_qty, v_pk, v_restock, case when v_restock then v_loc end, v_refund);

    update public.sale_items
       set returned_qty_kg = returned_qty_kg + v_qty, returned_packages = returned_packages + v_pk
     where id = it.id;

    if v_restock then
      perform public._apply_stock_delta('sale_return', it.batch_id, v_loc, v_qty, v_pk, uid,
        'sale_returns', ret_id, trim(p_reason), null);
    end if;
  end loop;

  update public.sale_returns set refund_amount = v_total_refund where id = ret_id;
  return ret_id;
end $$;

-- ---------------------------------------------------------------- transfers & adjustments
create function public.transfer_stock(
  p_batch_id uuid, p_from_location uuid, p_to_location uuid,
  p_qty_kg numeric, p_packages int default 0, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_role('admin', 'store_manager', 'warehouse_worker');
  tid uuid;
  v_qty numeric := round(coalesce(p_qty_kg, 0), 3);
  v_pk int := coalesce(p_packages, 0);
begin
  if p_from_location = p_to_location then
    raise exception 'מיקום המקור והיעד זהים' using errcode = 'P0001', hint = 'SAME_LOCATION';
  end if;
  if v_qty < 0 or v_pk < 0 or (v_qty = 0 and v_pk = 0) then
    raise exception 'יש להזין כמות להעברה' using errcode = 'P0001', hint = 'QTY';
  end if;
  if not exists (select 1 from public.storage_locations where id = p_to_location and is_active) then
    raise exception 'מיקום היעד לא נמצא או אינו פעיל' using errcode = 'P0001', hint = 'LOCATION';
  end if;

  perform public._lock_stock(jsonb_build_array(
    jsonb_build_object('batch_id', p_batch_id, 'location_id', p_from_location),
    jsonb_build_object('batch_id', p_batch_id, 'location_id', p_to_location)));

  insert into public.stock_transfers (batch_id, from_location_id, to_location_id, qty_kg, packages, notes, created_by)
  values (p_batch_id, p_from_location, p_to_location, v_qty, v_pk, nullif(trim(p_notes), ''), uid)
  returning id into tid;

  perform public._apply_stock_delta('transfer_out', p_batch_id, p_from_location, -v_qty, -v_pk, uid, 'stock_transfers', tid, p_notes, null);
  perform public._apply_stock_delta('transfer_in', p_batch_id, p_to_location, v_qty, v_pk, uid, 'stock_transfers', tid, p_notes, null);
  return tid;
end $$;

-- Stock count correction (+/-) or waste (must be negative). A reason is mandatory.
create function public.adjust_stock(
  p_batch_id uuid, p_location_id uuid, p_qty_delta numeric, p_packages_delta int,
  p_kind public.txn_type, p_reason text
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_role('admin', 'store_manager', 'warehouse_worker');
begin
  if p_kind not in ('adjustment', 'waste') then
    raise exception 'סוג התאמה לא חוקי' using errcode = 'P0001', hint = 'KIND';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'יש לציין סיבה' using errcode = 'P0001', hint = 'REASON';
  end if;
  if coalesce(p_qty_delta, 0) = 0 and coalesce(p_packages_delta, 0) = 0 then
    raise exception 'יש להזין כמות' using errcode = 'P0001', hint = 'QTY';
  end if;
  if p_kind = 'waste' and (coalesce(p_qty_delta, 0) > 0 or coalesce(p_packages_delta, 0) > 0) then
    raise exception 'השמדה חייבת להפחית מלאי' using errcode = 'P0001', hint = 'QTY';
  end if;
  if not exists (select 1 from public.batches where id = p_batch_id) then
    raise exception 'האצווה לא נמצאה' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  return public._apply_stock_delta(p_kind, p_batch_id, p_location_id, p_qty_delta, p_packages_delta, uid,
    null, null, trim(p_reason), null);
end $$;

-- Documented reversal of a receipt / adjustment / waste transaction.
-- Sales are reversed with cancel_sale / return_sale_items, transfers with a new transfer.
create function public.reverse_transaction(p_txn_id bigint, p_reason text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public._require_role('admin', 'store_manager');
  t public.inventory_transactions%rowtype;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'יש לציין סיבת ביטול' using errcode = 'P0001', hint = 'REASON';
  end if;
  select * into t from public.inventory_transactions where id = p_txn_id;
  if not found then
    raise exception 'התנועה לא נמצאה' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  if t.txn_type not in ('receipt', 'adjustment', 'waste') then
    raise exception 'ניתן לבטל כך רק קבלה, התאמה או השמדה. מכירות מבטלים ממסך המכירות.'
      using errcode = 'P0001', hint = 'NOT_REVERSIBLE';
  end if;
  if exists (select 1 from public.inventory_transactions where reverses_txn_id = p_txn_id) then
    raise exception 'התנועה כבר בוטלה' using errcode = 'P0001', hint = 'ALREADY_REVERSED';
  end if;
  return public._apply_stock_delta('reversal', t.batch_id, t.location_id, -t.qty_kg_delta, -t.packages_delta, uid,
    'inventory_transactions', null, trim(p_reason), p_txn_id);
end $$;

grant execute on function
  public.receive_goods(jsonb),
  public.create_sale(uuid, jsonb, uuid[], numeric, text, text),
  public.cancel_sale(uuid, text),
  public.return_sale_items(uuid, jsonb, text),
  public.transfer_stock(uuid, uuid, uuid, numeric, int, text),
  public.adjust_stock(uuid, uuid, numeric, int, public.txn_type, text),
  public.reverse_transaction(bigint, text)
to authenticated;
