import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PointOfSale } from "./pos";

export const metadata: Metadata = { title: "קופה" };

export default async function NewSalePage() {
  await requirePermission("sales.create");
  const supabase = await createClient();
  const [{ data: products }, { data: bodies }, { data: categories }, { data: images }] = await Promise.all([
    supabase.from("v_product_stock").select("*").eq("is_active", true).order("product_name"),
    supabase.from("kosher_bodies").select("id, name").eq("is_active", true).order("name"),
    supabase.from("categories").select("id, name, color").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("products").select("id, image_path").eq("is_active", true).not("image_path", "is", null),
  ]);

  const paths = (images ?? []).map((i) => i.image_path!);
  const { data: signed } = paths.length
    ? await supabase.storage.from("product-images").createSignedUrls(paths, 60 * 60 * 8)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const imageByProduct = new Map((images ?? []).map((i) => [i.id, urlByPath.get(i.image_path) ?? null]));

  return (
    <PointOfSale
      products={(products ?? []).map((p) => ({
        id: p.product_id!,
        name: p.product_name!,
        sku: p.sku!,
        barcode: p.barcode,
        categoryId: p.category_id,
        price: Number(p.sale_price_per_kg),
        sellableKg: Number(p.sellable_qty_kg),
        nearestExpiry: p.nearest_expiry,
        imageUrl: imageByProduct.get(p.product_id!) ?? null,
      }))}
      kosherBodies={(bodies ?? []).map((b) => ({ value: b.id, label: b.name }))}
      categories={(categories ?? []).map((c) => ({ value: c.id, label: c.name, color: c.color }))}
    />
  );
}
