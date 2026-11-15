import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Option = { value: string; label: string; hint?: string; keywords?: string[] };

/** Active reference data for pickers. */
export async function getLookups(supabase: Supabase) {
  const [products, costs, suppliers, bodies, certs, locations, warehouses, categories] = await Promise.all([
    supabase.from("products").select("id, name, sku, barcode, sale_price_per_kg, category_id").eq("is_active", true).order("name"),
    // Cost prices: rows come back for admin / store_manager only.
    supabase.from("v_product_costs").select("product_id, cost_price_per_kg"),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("kosher_bodies").select("id, name").eq("is_active", true).order("name"),
    supabase.from("kosher_certificates").select("id, kosher_body_id, certificate_number, valid_until, supplier_id").eq("is_active", true).order("valid_until", { ascending: false }),
    supabase.from("storage_locations").select("id, name, code, warehouse_id").eq("is_active", true).order("code"),
    supabase.from("warehouses").select("id, name").order("name"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  const costById = new Map((costs.data ?? []).map((c) => [c.product_id, Number(c.cost_price_per_kg)]));
  const whName = new Map((warehouses.data ?? []).map((w) => [w.id, w.name]));

  return {
    products: (products.data ?? []).map((p) => ({
      value: p.id,
      label: p.name,
      hint: p.sku,
      keywords: [p.sku, p.barcode ?? ""],
      /** null when the user may not see cost prices. */
      cost: costById.get(p.id) ?? null,
      price: Number(p.sale_price_per_kg),
      barcode: p.barcode,
      categoryId: p.category_id,
    })),
    suppliers: (suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    kosherBodies: (bodies.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    certificates: (certs.data ?? []).map((c) => ({
      value: c.id,
      label: c.certificate_number,
      bodyId: c.kosher_body_id,
      supplierId: c.supplier_id,
      validUntil: c.valid_until,
    })),
    locations: (locations.data ?? []).map((l) => ({
      value: l.id,
      label: `${l.name} (${l.code})`,
      hint: whName.get(l.warehouse_id),
      keywords: [l.code, whName.get(l.warehouse_id) ?? ""],
      warehouseId: l.warehouse_id,
    })),
    warehouses: (warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name })),
    categories: (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  };
}

export type Lookups = Awaited<ReturnType<typeof getLookups>>;
