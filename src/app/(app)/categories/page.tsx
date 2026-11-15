import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoriesManager } from "./categories-manager";

export const metadata: Metadata = { title: "קטגוריות" };

export default async function CategoriesPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select("category_id"),
  ]);
  const counts = new Map<string, number>();
  for (const p of products ?? []) if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);

  return (
    <>
      <PageHeader icon={Tags} title="קטגוריות" description="קיבוץ המוצרים לקטגוריות לחיפוש, סינון ודוחות" />
      <CategoriesManager rows={(categories ?? []).map((c) => ({ ...c, product_count: counts.get(c.id) ?? 0 }))} />
    </>
  );
}
