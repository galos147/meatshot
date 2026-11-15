import type { Metadata } from "next";
import { Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WarehousesManager } from "./warehouses-manager";

export const metadata: Metadata = { title: "מחסנים" };

export default async function WarehousesPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: warehouses }, { data: locations }, { data: stock }] = await Promise.all([
    supabase.from("warehouses").select("*").order("name"),
    supabase.from("storage_locations").select("id, warehouse_id"),
    supabase.from("v_stock").select("warehouse_id, qty_kg"),
  ]);

  const rows = (warehouses ?? []).map((w) => ({
    ...w,
    location_count: (locations ?? []).filter((l) => l.warehouse_id === w.id).length,
    qty_kg: (stock ?? []).filter((s) => s.warehouse_id === w.id).reduce((sum, s) => sum + Number(s.qty_kg ?? 0), 0),
  }));

  return (
    <>
      <PageHeader icon={Warehouse} title="מחסנים" description="מבנים או אזורים שבהם נמצאים המקררים והמקפיאים" />
      <WarehousesManager rows={rows} />
    </>
  );
}
