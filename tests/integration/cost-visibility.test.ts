import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { isoDate, must, receive, seedCatalogue, signInAs, type Catalogue, type Client } from "./helpers";

// Cost prices and margins are for admin / store_manager only ("reports.financial").
// The restriction must hold in the database, not just in the screens: every employee
// holds a token that can query the API directly.

let manager: Client;
let admin: Client;
let cat: Catalogue;
let batchId: string;
let saleId: string;
const restricted: Record<string, Client> = {};

// Untyped access: these tests deliberately ask for columns the typed client may not offer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw = (c: Client) => c as unknown as { from: (t: string) => any };

beforeAll(async () => {
  [manager, admin, restricted.sales_employee, restricted.warehouse_worker, restricted.viewer] = await Promise.all([
    signInAs("store_manager"),
    signInAs("admin"),
    signInAs("sales_employee"),
    signInAs("warehouse_worker"),
    signInAs("viewer"),
  ]);
  cat = await seedCatalogue(manager); // sale 120, cost 80
  const { batches } = await receive(restricted.warehouse_worker, cat, [{ qty_kg: 10, expiry_date: isoDate(10) }]);
  batchId = batches[0].id;
  saleId = must(
    await restricted.sales_employee.rpc("create_sale", {
      p_idempotency_key: crypto.randomUUID(),
      p_items: [{ batch_id: batchId, location_id: cat.fridge1.id, qty_kg: 2 }] as never,
      p_kosher_body_ids: [],
      p_sale_discount: 0,
    }),
  );
});

const baseColumns: Array<[table: string, column: string]> = [
  ["products", "cost_price_per_kg"],
  ["batches", "cost_price_per_kg"],
  ["sales", "total_cost"],
  ["sale_items", "cost_per_kg"],
];

describe.each(["sales_employee", "warehouse_worker", "viewer"])("cost data is hidden from %s", (role) => {
  it.each(baseColumns)("cannot read %s.%s", async (table, column) => {
    const client = raw(restricted[role]);
    const named = await client.from(table).select(column);
    expect(named.error?.code).toBe("42501");
    const star = await client.from(table).select("*");
    expect(star.error?.code).toBe("42501");
  });

  it("still reads the non-financial columns", async () => {
    const client = restricted[role];
    expect(must(await client.from("products").select("id, sale_price_per_kg").eq("id", cat.product.id)).length).toBe(1);
    expect(must(await client.from("batches").select("id, batch_number").eq("id", batchId)).length).toBe(1);
    expect(must(await client.from("sales").select("id, total").eq("id", saleId)).length).toBe(1);
    expect(must(await client.from("sale_items").select("id, line_total").eq("sale_id", saleId)).length).toBe(1);
  });

  it("gets stock views with the cost blanked out", async () => {
    const client = restricted[role];
    const stock = must(await client.from("v_stock").select("*").eq("batch_id", batchId));
    expect(stock).toHaveLength(1);
    expect(Number(stock[0].qty_kg)).toBe(8);
    expect(stock[0].cost_price_per_kg).toBeNull();
    expect(stock[0].cost_value).toBeNull();

    const batch = must(await client.from("v_batches").select("*").eq("id", batchId).single());
    expect(batch.batch_number).toBeTruthy();
    expect(batch.cost_price_per_kg).toBeNull();

    const product = must(await client.from("v_product_stock").select("*").eq("product_id", cat.product.id).single());
    expect(Number(product.sale_price_per_kg)).toBe(120);
    expect(product.cost_price_per_kg).toBeNull();
    expect(product.cost_value).toBeNull();
  });

  it.each(["v_product_costs", "v_sale_costs", "v_sale_item_costs"])("gets no rows from %s", async (view) => {
    const res = await raw(restricted[role]).from(view).select("*");
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});

describe.each(["store_manager", "admin"])("cost data for %s", (role) => {
  const client = () => (role === "admin" ? admin : manager);

  it("is available through the stock views", async () => {
    const stock = must(await client().from("v_stock").select("*").eq("batch_id", batchId).single());
    expect(Number(stock.cost_price_per_kg)).toBe(80);
    expect(Number(stock.cost_value)).toBe(640);
    const batch = must(await client().from("v_batches").select("*").eq("id", batchId).single());
    expect(Number(batch.cost_price_per_kg)).toBe(80);
    const product = must(await client().from("v_product_stock").select("*").eq("product_id", cat.product.id).single());
    expect(Number(product.cost_price_per_kg)).toBe(80);
    expect(Number(product.cost_value)).toBe(640);
  });

  it("is available through the finance views", async () => {
    const c = client();
    const product = must(await c.from("v_product_costs").select("*").eq("product_id", cat.product.id).single());
    expect(Number(product.cost_price_per_kg)).toBe(80);
    const sale = must(await c.from("v_sale_costs").select("*").eq("sale_id", saleId).single());
    expect(Number(sale.total_cost)).toBe(160);
    const items = must(await c.from("v_sale_item_costs").select("*").eq("sale_id", saleId));
    expect(items).toHaveLength(1);
    expect(Number(items[0].cost_per_kg)).toBe(80);
  });

  it("can still set a product's cost price", async () => {
    const res = await client().from("products").update({ cost_price_per_kg: 80 }).eq("id", cat.product.id).select("id");
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
  });
});

describe("cost data without a login", () => {
  it.each(["v_product_costs", "v_sale_costs", "v_sale_item_costs", "v_stock", "v_batches", "v_product_stock"])(
    "anonymous visitors get nothing from %s",
    async (view) => {
      const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const res = await anon.from(view).select("*");
      expect(res.data ?? []).toEqual([]);
    },
  );

  it("a deactivated employee gets nothing from the stock views", async () => {
    const leaver = await signInAs("store_manager");
    const { data: me } = await leaver.auth.getUser();
    const { admin: service } = await import("./helpers");
    must(await service.from("profiles").update({ is_active: false }).eq("id", me.user!.id).select("id"));
    for (const view of ["v_stock", "v_batches", "v_product_stock"] as const) {
      expect(must(await leaver.from(view).select("*"))).toEqual([]);
    }
    expect((await raw(leaver).from("v_product_costs").select("*")).data).toEqual([]);
  });
});
