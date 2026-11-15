import type { Metadata } from "next";
import Link from "next/link";
import { Receipt, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { isoDaysAgo, storeDayRange, todayIso } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { SalesTable } from "./sales-table";

export const metadata: Metadata = { title: "היסטוריית מכירות" };

export default async function SalesPage({ searchParams }: PageProps<"/sales">) {
  const user = await requireUser();
  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : isoDaysAgo(6);
  const to = typeof sp.to === "string" ? sp.to : todayIso();
  const [start, end] = storeDayRange(from, to);

  const supabase = await createClient();
  const salesQuery = supabase
    .from("sales")
    .select("id, sale_number, created_at, status, total, subtotal, items_discount, sale_discount, customer_name, created_by, profiles!sales_created_by_fkey(full_name), sale_items(qty_kg), sale_returns(refund_amount)")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false })
    .limit(5000);
  // Cost: rows come back for admin / store_manager only.
  const costsQuery = supabase.from("v_sale_costs").select("sale_id, total_cost").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }).limit(5000);
  const [{ data }, { data: costs }] = await Promise.all([salesQuery, costsQuery]);
  const costById = new Map((costs ?? []).map((c) => [c.sale_id, Number(c.total_cost)]));

  const rows = (data ?? []).map((s) => ({
    id: s.id,
    sale_number: s.sale_number,
    created_at: s.created_at,
    status: s.status,
    total: Number(s.total),
    discount: Number(s.items_discount) + Number(s.sale_discount),
    refunds: (s.sale_returns ?? []).reduce((sum, r) => sum + Number(r.refund_amount), 0),
    cost: costById.get(s.id) ?? 0,
    kg: (s.sale_items ?? []).reduce((sum, i) => sum + Number(i.qty_kg), 0),
    lines: s.sale_items?.length ?? 0,
    customer_name: s.customer_name,
    seller: s.profiles?.full_name ?? "",
    seller_id: s.created_by,
  }));

  return (
    <>
      <PageHeader
        icon={Receipt}
        title="היסטוריית מכירות"
        description="כל המכירות, כולל מי מכר ומתי. ביטולים והחזרות מתבצעים מתוך המכירה."
        actions={
          can(user.role, "sales.create") && (
            <Button asChild size="lg" className="shadow-sm shadow-primary/25"><Link href="/sales/new"><ShoppingCart />מכירה חדשה</Link></Button>
          )
        }
      />
      <SalesTable rows={rows} from={from} to={to} showProfit={can(user.role, "reports.financial")} />
    </>
  );
}
