import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/types/database";

type Role = Database["public"]["Enums"]["app_role"];
export type Client = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

export const admin = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Creates an employee with the given role and returns a client signed in as them. */
export async function signInAs(role: Role): Promise<Client> {
  const email = `${role}-${randomUUID().slice(0, 8)}@test.local`;
  const password = "Test-password-123";
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: `בדיקה ${role}` },
  });
  if (error) throw error;
  const client = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return client;
}

export function must<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error;
  return res.data as NonNullable<T>;
}

export const isoDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

/** Creates a minimal catalogue (as a manager) and returns the ids. */
export async function seedCatalogue(manager: Client) {
  const tag = randomUUID().slice(0, 6);
  const supplier = must(await manager.from("suppliers").insert({ name: `ספק ${tag}` }).select().single());
  const kosherA = must(await manager.from("kosher_bodies").insert({ name: `בד"ץ א ${tag}` }).select().single());
  const kosherB = must(await manager.from("kosher_bodies").insert({ name: `רבנות ${tag}` }).select().single());
  const warehouse = must(await manager.from("warehouses").insert({ name: `מחסן ${tag}` }).select().single());
  const fridge1 = must(
    await manager.from("storage_locations").insert({ warehouse_id: warehouse.id, name: "מקרר 1", code: `F1-${tag}` }).select().single(),
  );
  const fridge2 = must(
    await manager.from("storage_locations").insert({ warehouse_id: warehouse.id, name: "מקרר 2", code: `F2-${tag}` }).select().single(),
  );
  const product = must(
    await manager
      .from("products")
      .insert({ name: `אנטריקוט ${tag}`, sku: `ENT-${tag}`, sale_price_per_kg: 120, cost_price_per_kg: 80, min_stock_kg: 5 })
      .select("id, name, sku")
      .single(),
  );
  return { supplier, kosherA, kosherB, warehouse, fridge1, fridge2, product };
}

export type Catalogue = Awaited<ReturnType<typeof seedCatalogue>>;

export async function receive(
  client: Client,
  cat: Catalogue,
  lines: Array<{ qty_kg: number; packages?: number; expiry_date: string; kosher_body_id?: string; location_id?: string; kosher_certificate_id?: string }>,
  receivedDate?: string,
) {
  const receiptId = must(
    await client.rpc("receive_goods", {
      p_receipt: {
        supplier_id: cat.supplier.id,
        received_date: receivedDate,
        lines: lines.map((l) => ({
          product_id: cat.product.id,
          kosher_body_id: l.kosher_body_id ?? cat.kosherA.id,
          kosher_certificate_id: l.kosher_certificate_id,
          location_id: l.location_id ?? cat.fridge1.id,
          expiry_date: l.expiry_date,
          qty_kg: l.qty_kg,
          packages: l.packages ?? 0,
        })),
      },
    }),
  );
  const batches = must(
    await client.from("batches").select("id, batch_number, product_id, kosher_body_id, receipt_id, expiry_date, created_by").eq("receipt_id", receiptId).order("batch_number"),
  );
  return { receiptId, batches };
}

export async function stockOf(client: Client, batchId: string, locationId: string) {
  const row = must(
    await client.from("stock_levels").select("qty_kg, packages").eq("batch_id", batchId).eq("location_id", locationId).maybeSingle(),
  );
  return { qty: Number(row?.qty_kg ?? 0), packages: row?.packages ?? 0 };
}
