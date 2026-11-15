import type { Metadata } from "next";
import { Refrigerator } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LocationsManager, LocationTypesManager } from "./locations-manager";

export const metadata: Metadata = { title: "מקררים ומיקומים" };

export default async function LocationsPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: locations }, { data: warehouses }, { data: types }, { data: stock }] = await Promise.all([
    supabase.from("storage_locations").select("*").order("code"),
    supabase.from("warehouses").select("id, name, is_active").order("name"),
    supabase.from("location_types").select("*").order("name"),
    supabase.from("v_stock").select("location_id, qty_kg, batch_id"),
  ]);

  const byLocation = new Map<string, { qty: number; batches: Set<string> }>();
  for (const s of stock ?? []) {
    const entry = byLocation.get(s.location_id!) ?? { qty: 0, batches: new Set<string>() };
    entry.qty += Number(s.qty_kg ?? 0);
    entry.batches.add(s.batch_id!);
    byLocation.set(s.location_id!, entry);
  }
  const whName = new Map((warehouses ?? []).map((w) => [w.id, w.name]));
  const typeName = new Map((types ?? []).map((t) => [t.id, t.name]));

  const rows = (locations ?? []).map((l) => ({
    ...l,
    warehouse_name: whName.get(l.warehouse_id) ?? "—",
    type_name: l.location_type_id ? (typeName.get(l.location_type_id) ?? null) : null,
    qty_kg: byLocation.get(l.id)?.qty ?? 0,
    batch_count: byLocation.get(l.id)?.batches.size ?? 0,
  }));

  return (
    <>
      <PageHeader
        icon={Refrigerator}
        title="מקררים ומיקומים"
        description="מקררים, מקפיאים, חדרי קירור ומדפים – מספר בלתי מוגבל. לחיצה על מיקום מציגה את כל המלאי שבו."
      />
      <Tabs defaultValue="locations" className="gap-4">
        <TabsList>
          <TabsTrigger value="locations">מיקומים ({rows.length})</TabsTrigger>
          <TabsTrigger value="types">סוגי מיקום ({types?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="locations">
          <LocationsManager
            rows={rows}
            warehouses={(warehouses ?? []).filter((w) => w.is_active).map((w) => ({ value: w.id, label: w.name }))}
            types={(types ?? []).filter((t) => t.is_active).map((t) => ({ value: t.id, label: t.name }))}
          />
        </TabsContent>
        <TabsContent value="types">
          <LocationTypesManager rows={types ?? []} />
        </TabsContent>
      </Tabs>
    </>
  );
}
