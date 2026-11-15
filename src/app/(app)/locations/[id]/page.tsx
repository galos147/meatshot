import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Layers, Refrigerator, Scale, Thermometer, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { StockTable } from "@/features/inventory/stock-table";
import { getLookups } from "@/features/lookups";
import { requireUser } from "@/lib/auth";
import { formatKg, tempRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "מלאי במיקום" };

export default async function LocationPage({ params }: PageProps<"/locations/[id]">) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: loc } = await supabase
    .from("storage_locations")
    .select("*, warehouses(name), location_types(name)")
    .eq("id", id)
    .maybeSingle();
  if (!loc) notFound();

  const [{ data: stock }, lookups] = await Promise.all([
    supabase.from("v_stock").select("*").eq("location_id", id).order("expiry_date"),
    getLookups(supabase),
  ]);
  const rows = stock ?? [];
  const total = rows.reduce((s, r) => s + Number(r.qty_kg), 0);
  const expiring = rows.filter((r) => (r.days_to_expiry ?? 99) <= 7).length;
  const temp = tempRange(loc.temp_min, loc.temp_max);

  return (
    <>
      <PageHeader
        icon={Refrigerator}
        title={loc.name}
        description={[loc.warehouses?.name, loc.location_types?.name, loc.zone && `אזור ${loc.zone}`, loc.shelf && `מדף ${loc.shelf}`].filter(Boolean).join(" · ")}
        actions={
          <Button asChild variant="outline" size="lg"><Link href="/locations"><ArrowRight />כל המיקומים</Link></Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="סה״כ במיקום" value={formatKg(total)} icon={Scale} />
        <StatCard label="אצוות" value={new Set(rows.map((r) => r.batch_id)).size} icon={Layers} accent="info" />
        <StatCard label="תפוגה ב-7 ימים / פג" value={expiring} icon={TriangleAlert} accent={expiring ? "danger" : "success"} />
        <StatCard label="טמפרטורה רצויה" value={temp ?? "לא הוגדר"} hint={<span className="ltr font-mono">{loc.code}</span>} icon={Thermometer} accent="info" />
      </div>
      <StockTable rows={rows} locations={lookups.locations} hide={["location"]} />
    </>
  );
}
