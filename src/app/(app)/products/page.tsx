import type { Metadata } from "next";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductsManager } from "./products-manager";

export const metadata: Metadata = { title: "מוצרים" };

export default async function ProductsPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: products }, { data: costs }, { data: categories }, { data: stock }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, barcode, category_id, description, image_path, sale_price_per_kg, min_stock_kg, is_active, created_at, updated_at")
      .order("name"),
    // Cost prices: rows come back for admin / store_manager only.
    supabase.from("v_product_costs").select("product_id, cost_price_per_kg"),
    supabase.from("categories").select("id, name, color, is_active").order("sort_order").order("name"),
    supabase.from("v_product_stock").select("product_id, qty_kg, sellable_qty_kg, packages, is_low_stock, nearest_expiry"),
  ]);

  const paths = (products ?? []).map((p) => p.image_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length
    ? await supabase.storage.from("product-images").createSignedUrls(paths, 60 * 60)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const costById = new Map((costs ?? []).map((c) => [c.product_id, c.cost_price_per_kg]));
  const stockById = new Map((stock ?? []).map((s) => [s.product_id, s]));
  const catById = new Map((categories ?? []).map((c) => [c.id, c]));

  const rows = (products ?? []).map((p) => {
    const s = stockById.get(p.id);
    const c = p.category_id ? catById.get(p.category_id) : undefined;
    return {
      ...p,
      cost_price_per_kg: costById.get(p.id) ?? null,
      image_url: p.image_path ? (urlByPath.get(p.image_path) ?? null) : null,
      category_name: c?.name ?? null,
      category_color: c?.color ?? null,
      qty_kg: Number(s?.qty_kg ?? 0),
      sellable_qty_kg: Number(s?.sellable_qty_kg ?? 0),
      packages: s?.packages ?? 0,
      is_low_stock: !!s?.is_low_stock,
    };
  });

  return (
    <>
      <PageHeader icon={Package} title="מוצרים" description="קטלוג מוצרי הבשר. המלאי עצמו מנוהל באצוות – כל משלוח הוא אצווה נפרדת." />
      <ProductsManager
        rows={rows}
        categories={(categories ?? []).filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name }))}
      />
    </>
  );
}
