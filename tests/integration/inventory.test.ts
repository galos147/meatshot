import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { admin, isoDate, must, receive, seedCatalogue, signInAs, stockOf, type Catalogue, type Client } from "./helpers";

let manager: Client;
let seller: Client;
let seller2: Client;
let warehouse: Client;
let viewer: Client;
let cat: Catalogue;

beforeAll(async () => {
  [manager, seller, seller2, warehouse, viewer] = await Promise.all([
    signInAs("store_manager"),
    signInAs("sales_employee"),
    signInAs("sales_employee"),
    signInAs("warehouse_worker"),
    signInAs("viewer"),
  ]);
  cat = await seedCatalogue(manager);
});

const sell = (client: Client, items: object[], opts: { key?: string; kosher?: string[]; discount?: number } = {}) =>
  client.rpc("create_sale", {
    p_idempotency_key: opts.key ?? randomUUID(),
    p_items: items as never,
    p_kosher_body_ids: opts.kosher ?? [],
    p_sale_discount: opts.discount ?? 0,
  });

describe("receiving", () => {
  it("creates one batch per line, the stock row and a ledger entry", async () => {
    const { batches, receiptId } = await receive(warehouse, cat, [
      { qty_kg: 10.125, packages: 4, expiry_date: isoDate(20) },
      { qty_kg: 5, packages: 2, expiry_date: isoDate(20), kosher_body_id: cat.kosherB.id },
    ]);
    expect(batches).toHaveLength(2);
    expect(batches[0].batch_number).not.toEqual(batches[1].batch_number);
    expect(await stockOf(manager, batches[0].id, cat.fridge1.id)).toEqual({ qty: 10.125, packages: 4 });

    const txns = must(await manager.from("inventory_transactions").select("*").eq("ref_id", receiptId));
    expect(txns).toHaveLength(2);
    expect(txns.every((t) => t.txn_type === "receipt")).toBe(true);
  });

  it("rejects expiry before the receiving date and non-positive quantities", async () => {
    await expect(receive(warehouse, cat, [{ qty_kg: 3, expiry_date: isoDate(-1) }])).rejects.toMatchObject({
      message: expect.stringContaining("תאריך התפוגה"),
    });
    await expect(receive(warehouse, cat, [{ qty_kg: 0, expiry_date: isoDate(5) }])).rejects.toBeTruthy();
  });

  it("is forbidden for sales employees and viewers", async () => {
    await expect(receive(seller, cat, [{ qty_kg: 1, expiry_date: isoDate(5) }])).rejects.toMatchObject({
      message: expect.stringContaining("הרשאה"),
    });
    await expect(receive(viewer, cat, [{ qty_kg: 1, expiry_date: isoDate(5) }])).rejects.toBeTruthy();
  });

  it("never allows changing a batch's expiry or kosher body (no merging)", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 2, expiry_date: isoDate(9) }]);
    const res = await manager.from("batches").update({ expiry_date: isoDate(30) }).eq("id", batches[0].id);
    expect(res.error?.message).toContain("לא ניתן לשנות");
    const res2 = await manager.from("batches").update({ kosher_body_id: cat.kosherB.id }).eq("id", batches[0].id);
    expect(res2.error).toBeTruthy();
  });
});

describe("sales", () => {
  it("deducts stock, prices from the catalogue and records the employee", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 10, packages: 5, expiry_date: isoDate(10) }]);
    const b = batches[0];
    const saleId = must(
      await sell(seller, [{ batch_id: b.id, location_id: cat.fridge1.id, qty_kg: 2.5, packages: 1, discount_amount: 10 }]),
    );
    const sale = must(await manager.from("sales").select("subtotal, total, created_by, sale_items(price_per_kg)").eq("id", saleId).single());
    expect(Number(sale.subtotal)).toBe(300);
    expect(Number(sale.total)).toBe(290);
    const cost = must(await manager.from("v_sale_costs").select("total_cost").eq("sale_id", saleId).single());
    expect(Number(cost.total_cost)).toBe(200);
    expect(sale.sale_items[0].price_per_kg).toBe(120);
    const { data: me } = await seller.auth.getUser();
    expect(sale.created_by).toBe(me.user!.id);
    expect(await stockOf(manager, b.id, cat.fridge1.id)).toEqual({ qty: 7.5, packages: 4 });
  });

  it("is idempotent: the same key twice records a single sale", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 4, expiry_date: isoDate(10) }]);
    const key = randomUUID();
    const items = [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 1 }];
    const [a, b] = await Promise.all([sell(seller, items, { key }), sell(seller, items, { key })]);
    expect(must(a)).toBe(must(b));
    expect((await stockOf(manager, batches[0].id, cat.fridge1.id)).qty).toBe(3);
  });

  it("refuses to sell more than is in stock", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 2, expiry_date: isoDate(10) }]);
    const res = await sell(seller, [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 2.001 }]);
    expect(res.error?.message).toContain("אין מספיק מלאי");
    expect((await stockOf(manager, batches[0].id, cat.fridge1.id)).qty).toBe(2);
  });

  it("prevents concurrent sales from overselling", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 10, expiry_date: isoDate(10) }]);
    const items = [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 6 }];
    const results = await Promise.all([sell(seller, items), sell(seller2, items), sell(seller, items)]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect((await stockOf(manager, batches[0].id, cat.fridge1.id)).qty).toBe(4);
  });

  it("rolls back the whole sale when one line fails", async () => {
    const { batches } = await receive(warehouse, cat, [
      { qty_kg: 5, expiry_date: isoDate(10) },
      { qty_kg: 1, expiry_date: isoDate(10) },
    ]);
    const res = await sell(seller, [
      { batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 2 },
      { batch_id: batches[1].id, location_id: cat.fridge1.id, qty_kg: 3 },
    ]);
    expect(res.error).toBeTruthy();
    expect((await stockOf(manager, batches[0].id, cat.fridge1.id)).qty).toBe(5);
  });

  it("blocks expired batches", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 3, expiry_date: isoDate(-2) }], isoDate(-10));
    const res = await sell(seller, [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 1 }]);
    expect(res.error?.message).toContain("פג תוקפה");
  });

  it("blocks batches that do not match the sale's kosher requirement", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 3, expiry_date: isoDate(8), kosher_body_id: cat.kosherB.id }]);
    const items = [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 1 }];
    const res = await sell(seller, items, { kosher: [cat.kosherA.id] });
    expect(res.error?.message).toContain("הכשר");
    expect((await sell(seller, items, { kosher: [cat.kosherA.id, cat.kosherB.id] })).error).toBeNull();
  });

  it("blocks batches whose kosher certificate has expired", async () => {
    const cert = must(
      await manager
        .from("kosher_certificates")
        .insert({ kosher_body_id: cat.kosherA.id, certificate_number: `C-${randomUUID().slice(0, 6)}`, valid_until: isoDate(-1) })
        .select()
        .single(),
    );
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 3, expiry_date: isoDate(8), kosher_certificate_id: cert.id }]);
    const res = await sell(seller, [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 1 }]);
    expect(res.error?.message).toContain("תעודת ההכשר");
  });

  it("is forbidden for warehouse workers and viewers", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 3, expiry_date: isoDate(8) }]);
    const items = [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 1 }];
    expect((await sell(warehouse, items)).error?.message).toContain("הרשאה");
    expect((await sell(viewer, items)).error).toBeTruthy();
  });

  it("suggests batches FEFO: nearest expiry first, ineligible last", async () => {
    const fresh = await seedCatalogue(manager);
    const late = await receive(warehouse, fresh, [{ qty_kg: 1, expiry_date: isoDate(15) }]);
    const early = await receive(warehouse, fresh, [{ qty_kg: 1, expiry_date: isoDate(4) }]);
    const otherKosher = await receive(warehouse, fresh, [{ qty_kg: 1, expiry_date: isoDate(2), kosher_body_id: fresh.kosherB.id }]);
    const rows = must(await seller.rpc("available_stock", { p_product_id: fresh.product.id, p_kosher_body_ids: [fresh.kosherA.id] }));
    expect(rows.map((r) => r.batch_id)).toEqual([early.batches[0].id, late.batches[0].id, otherKosher.batches[0].id]);
    expect(rows[2].is_sellable).toBe(false);
    expect(rows[2].block_reason).toBe("kosher_mismatch");
  });
});

describe("cancellations and returns", () => {
  it("cancelling a sale restores stock with documented transactions", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 6, packages: 3, expiry_date: isoDate(10) }]);
    const saleId = must(await sell(seller, [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 2, packages: 1 }]));
    expect((await seller.rpc("cancel_sale", { p_sale_id: saleId, p_reason: "טעות" })).error?.message).toContain("הרשאה");
    must(await manager.rpc("cancel_sale", { p_sale_id: saleId, p_reason: "טעות בהקלדה" }));
    expect(await stockOf(manager, batches[0].id, cat.fridge1.id)).toEqual({ qty: 6, packages: 3 });
    expect((await manager.rpc("cancel_sale", { p_sale_id: saleId, p_reason: "שוב" })).error?.message).toContain("כבר בוטלה");
    const sale = must(await manager.from("sales").select("status").eq("id", saleId).single());
    expect(sale.status).toBe("cancelled");
  });

  it("partial return restocks and cannot exceed what was sold", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 6, expiry_date: isoDate(10) }]);
    const saleId = must(await sell(seller, [{ batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg: 3 }]));
    const item = must(await manager.from("sale_items").select("id").eq("sale_id", saleId).single());
    must(
      await manager.rpc("return_sale_items", {
        p_sale_id: saleId,
        p_reason: "לקוח החזיר",
        p_items: [{ sale_item_id: item.id, qty_kg: 1, restock: true }],
      }),
    );
    expect((await stockOf(manager, batches[0].id, cat.fridge1.id)).qty).toBe(4);
    const over = await manager.rpc("return_sale_items", {
      p_sale_id: saleId,
      p_reason: "שוב",
      p_items: [{ sale_item_id: item.id, qty_kg: 2.5, restock: true }],
    });
    expect(over.error?.message).toContain("יותר ממה שנמכר");
    // Cancelling afterwards restores only what was not returned.
    must(await manager.rpc("cancel_sale", { p_sale_id: saleId, p_reason: "ביטול" }));
    expect((await stockOf(manager, batches[0].id, cat.fridge1.id)).qty).toBe(6);
  });
});

describe("transfers, adjustments and the ledger", () => {
  it("transfers between fridges and refuses to move more than exists", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 5, packages: 2, expiry_date: isoDate(10) }]);
    const b = batches[0];
    must(
      await warehouse.rpc("transfer_stock", {
        p_batch_id: b.id, p_from_location: cat.fridge1.id, p_to_location: cat.fridge2.id, p_qty_kg: 2, p_packages: 1,
      }),
    );
    expect(await stockOf(manager, b.id, cat.fridge1.id)).toEqual({ qty: 3, packages: 1 });
    expect(await stockOf(manager, b.id, cat.fridge2.id)).toEqual({ qty: 2, packages: 1 });
    const over = await warehouse.rpc("transfer_stock", {
      p_batch_id: b.id, p_from_location: cat.fridge1.id, p_to_location: cat.fridge2.id, p_qty_kg: 3.5, p_packages: 0,
    });
    expect(over.error?.message).toContain("אין מספיק מלאי");
  });

  it("adjusts with a reason, and reversal is documented and one-time", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 5, expiry_date: isoDate(10) }]);
    const b = batches[0];
    expect(
      (await warehouse.rpc("adjust_stock", {
        p_batch_id: b.id, p_location_id: cat.fridge1.id, p_qty_delta: -1, p_packages_delta: 0, p_kind: "waste", p_reason: "",
      })).error,
    ).toBeTruthy();
    const txnId = must(
      await warehouse.rpc("adjust_stock", {
        p_batch_id: b.id, p_location_id: cat.fridge1.id, p_qty_delta: -1.25, p_packages_delta: 0, p_kind: "waste", p_reason: "התקלקל",
      }),
    );
    expect((await stockOf(manager, b.id, cat.fridge1.id)).qty).toBe(3.75);
    must(await manager.rpc("reverse_transaction", { p_txn_id: txnId!, p_reason: "נרשם בטעות" }));
    expect((await stockOf(manager, b.id, cat.fridge1.id)).qty).toBe(5);
    expect((await manager.rpc("reverse_transaction", { p_txn_id: txnId!, p_reason: "שוב" })).error?.message).toContain("כבר בוטלה");
    expect(
      (await warehouse.rpc("adjust_stock", {
        p_batch_id: b.id, p_location_id: cat.fridge1.id, p_qty_delta: -6, p_packages_delta: 0, p_kind: "adjustment", p_reason: "ספירה",
      })).error?.message,
    ).toContain("אין מספיק מלאי");
  });

  it("ledger rows cannot be edited or deleted, even with the service key", async () => {
    const row = must(await admin.from("inventory_transactions").select("id").limit(1).single());
    const upd = await admin.from("inventory_transactions").update({ reason: "x" }).eq("id", row.id);
    expect(upd.error?.message).toContain("אסור");
    const del = await admin.from("inventory_transactions").delete().eq("id", row.id);
    expect(del.error?.message).toContain("אסור");
  });

  it("stock cannot be written directly by any employee", async () => {
    const { batches } = await receive(warehouse, cat, [{ qty_kg: 5, expiry_date: isoDate(10) }]);
    await manager.from("stock_levels").update({ qty_kg: 999 }).eq("batch_id", batches[0].id);
    expect((await stockOf(manager, batches[0].id, cat.fridge1.id)).qty).toBe(5);
    const ins = await manager.from("inventory_transactions").insert({
      txn_type: "adjustment", batch_id: batches[0].id, location_id: cat.fridge1.id, qty_kg_delta: 1, created_by: batches[0].created_by,
    });
    expect(ins.error).toBeTruthy();
  });
});

describe("permissions (RLS)", () => {
  it("only managers maintain the catalogue", async () => {
    expect((await seller.from("categories").insert({ name: `x-${randomUUID()}` })).error).toBeTruthy();
    expect((await warehouse.from("products").update({ sale_price_per_kg: 1 }).eq("id", cat.product.id).select("id")).data).toEqual([]);
    expect((await manager.from("categories").insert({ name: `ok-${randomUUID()}` })).error).toBeNull();
  });

  it("employees cannot promote themselves", async () => {
    const { data: me } = await seller.auth.getUser();
    const res = await seller.from("profiles").update({ role: "admin" }).eq("id", me.user!.id).select();
    expect(res.data).toEqual([]);
  });

  it("anonymous visitors see nothing", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const res = await anon.from("products").select("*");
    expect(res.data ?? []).toEqual([]);
  });
});

describe("alerts", () => {
  it("raises expiry, expired and low-stock alerts once, and resolves them when cleared", async () => {
    const fresh = await seedCatalogue(manager);
    const soon = await receive(warehouse, fresh, [{ qty_kg: 1, expiry_date: isoDate(2) }]);
    await receive(warehouse, fresh, [{ qty_kg: 1, expiry_date: isoDate(-1) }], isoDate(-5));
    must(await admin.rpc("generate_alerts"));
    must(await admin.rpc("generate_alerts")); // idempotent

    const alerts = must(
      await manager.from("alerts").select("*").or(`product_id.eq.${fresh.product.id}`).neq("status", "resolved"),
    );
    const types = alerts.map((a) => `${a.alert_type}:${a.threshold_days ?? ""}`).sort();
    expect(types).toEqual(["expired:", "expiry_soon:3", "low_stock:"]);

    // Selling out the expiring batch resolves its alert.
    must(await sell(seller, [{ batch_id: soon.batches[0].id, location_id: fresh.fridge1.id, qty_kg: 1 }]));
    must(await admin.rpc("generate_alerts"));
    const open = must(
      await manager.from("alerts").select("alert_type").eq("batch_id", soon.batches[0].id).neq("status", "resolved"),
    );
    expect(open).toEqual([]);
  });
});
