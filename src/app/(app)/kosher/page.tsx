import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CertificatesManager, KosherBodiesManager, KosherLevelsManager } from "./kosher-managers";

export const metadata: Metadata = { title: "הכשרים" };

export default async function KosherPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: bodies }, { data: levels }, { data: certs }, { data: suppliers }, { data: stock }, { data: today }] = await Promise.all([
    supabase.from("kosher_bodies").select("*").order("name"),
    supabase.from("kosher_levels").select("*").order("rank"),
    supabase.from("kosher_certificates").select("*").order("valid_until"),
    supabase.from("suppliers").select("id, name, is_active").order("name"),
    supabase.from("v_stock").select("kosher_body_id, qty_kg"),
    supabase.rpc("store_today"),
  ]);

  const levelName = new Map((levels ?? []).map((l) => [l.id, l.name]));
  const bodyName = new Map((bodies ?? []).map((b) => [b.id, b.name]));
  const supplierName = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const stockByBody = new Map<string, number>();
  for (const s of stock ?? []) stockByBody.set(s.kosher_body_id!, (stockByBody.get(s.kosher_body_id!) ?? 0) + Number(s.qty_kg ?? 0));

  const todayIso = today as string;
  const dayDiff = (d: string) => Math.round((Date.parse(d) - Date.parse(todayIso)) / 86_400_000);

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title="הכשרים"
        description="גופי הכשר, תעודות ורמות כשרות. לכל אצווה נשמר ההכשר המדויק שלה, ומכירה נחסמת כשאינה תואמת."
      />
      <Tabs defaultValue="bodies" className="gap-4">
        <TabsList>
          <TabsTrigger value="bodies">גופי הכשר ({bodies?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="certs">תעודות ({certs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="levels">רמות כשרות ({levels?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="bodies">
          <KosherBodiesManager
            rows={(bodies ?? []).map((b) => ({
              ...b,
              level_name: b.level_id ? (levelName.get(b.level_id) ?? null) : null,
              qty_kg: stockByBody.get(b.id) ?? 0,
            }))}
            levels={(levels ?? []).filter((l) => l.is_active).map((l) => ({ value: l.id, label: l.name }))}
          />
        </TabsContent>
        <TabsContent value="certs">
          <CertificatesManager
            rows={(certs ?? []).map((c) => ({
              ...c,
              body_name: bodyName.get(c.kosher_body_id) ?? "—",
              supplier_name: c.supplier_id ? (supplierName.get(c.supplier_id) ?? null) : null,
              days_left: dayDiff(c.valid_until),
            }))}
            bodies={(bodies ?? []).filter((b) => b.is_active).map((b) => ({ value: b.id, label: b.name }))}
            suppliers={(suppliers ?? []).filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.name }))}
          />
        </TabsContent>
        <TabsContent value="levels">
          <KosherLevelsManager rows={levels ?? []} />
        </TabsContent>
      </Tabs>
    </>
  );
}
