import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BatchesTable } from "./batches-table";

export const metadata: Metadata = { title: "אצוות" };

export default async function BatchesPage({ searchParams }: PageProps<"/batches">) {
  await requireUser();
  const { product } = await searchParams;
  const supabase = await createClient();
  const [{ data: batches }, { data: products }, { data: bodies }, { data: suppliers }] = await Promise.all([
    supabase.from("v_batches").select("*").order("received_date", { ascending: false }).order("batch_number", { ascending: false }).limit(2000),
    supabase.from("products").select("id, name").order("name"),
    supabase.from("kosher_bodies").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  return (
    <>
      <PageHeader
        icon={Layers}
        title="אצוות"
        description="כל משלוח שהתקבל הוא אצווה נפרדת עם תפוגה והכשר משלה. אצוות לעולם לא מתאחדות."
      />
      <BatchesTable
        rows={batches ?? []}
        initialProduct={typeof product === "string" ? product : undefined}
        products={(products ?? []).map((p) => ({ value: p.id, label: p.name }))}
        kosherBodies={(bodies ?? []).map((b) => ({ value: b.id, label: b.name }))}
        suppliers={(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))}
      />
    </>
  );
}
