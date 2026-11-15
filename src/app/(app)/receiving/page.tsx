import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ReceiptsTable } from "./receipts-table";

export const metadata: Metadata = { title: "קבלת סחורה" };

export default async function ReceivingPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: receipts }, { data: batches }] = await Promise.all([
    supabase
      .from("receipts")
      .select("*, suppliers(name), profiles(full_name)")
      .order("received_date", { ascending: false })
      .order("receipt_number", { ascending: false })
      .limit(1000),
    // v_batches blanks the cost for everyone but admin / store_manager.
    supabase.from("v_batches").select("receipt_id, initial_qty_kg, cost_price_per_kg").not("receipt_id", "is", null),
  ]);

  const totals = new Map<string, { lines: number; kg: number; cost: number }>();
  for (const b of batches ?? []) {
    const t = totals.get(b.receipt_id!) ?? { lines: 0, kg: 0, cost: 0 };
    t.lines += 1;
    t.kg += Number(b.initial_qty_kg);
    t.cost += Number(b.initial_qty_kg) * Number(b.cost_price_per_kg);
    totals.set(b.receipt_id!, t);
  }

  const rows = (receipts ?? []).map((r) => ({
    id: r.id,
    receipt_number: r.receipt_number,
    received_date: r.received_date,
    delivery_note_number: r.delivery_note_number,
    supplier_id: r.supplier_id,
    supplier_name: r.suppliers?.name ?? "—",
    created_by_name: r.profiles?.full_name ?? "—",
    ...(totals.get(r.id) ?? { lines: 0, kg: 0, cost: 0 }),
  }));

  return (
    <>
      <PageHeader
        icon={PackagePlus}
        title="קבלת סחורה"
        description="היסטוריית המשלוחים שהתקבלו. כל משלוח יוצר אצוות חדשות במלאי."
        actions={
          can(user.role, "stock.receive") && (
            <Button asChild size="lg" className="shadow-sm shadow-primary/25"><Link href="/receiving/new"><PackagePlus />קבלה חדשה</Link></Button>
          )
        }
      />
      <ReceiptsTable rows={rows} showCost={can(user.role, "reports.financial")} />
    </>
  );
}
