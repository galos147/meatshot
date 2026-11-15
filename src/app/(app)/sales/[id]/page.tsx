import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLookups } from "@/features/lookups";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDateTime, formatKg } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AutoPrint, CancelSaleButton, ReturnItemsButton } from "./sale-actions";

export const metadata: Metadata = { title: "מכירה" };

export default async function SalePage({ params, searchParams }: PageProps<"/sales/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { print } = await searchParams;
  const supabase = await createClient();
  const { data: sale } = await supabase
    .from("sales")
    .select("id, sale_number, kosher_body_ids, subtotal, items_discount, sale_discount, total, status, customer_name, notes, created_by, created_at, cancelled_by, cancelled_at, cancel_reason, seller:profiles!sales_created_by_fkey(full_name), canceller:profiles!sales_cancelled_by_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!sale) notFound();

  const [{ data: items }, { data: cost }, { data: returns }, { data: settings }, { data: bodies }, lookups] = await Promise.all([
    supabase.from("sale_items").select("id, sale_id, line_no, product_id, batch_id, location_id, qty_kg, packages, price_per_kg, gross_amount, discount_amount, line_total, returned_qty_kg, returned_packages, products(name, sku), batches(batch_number, kosher_body_id, kosher_bodies(name)), storage_locations(name)").eq("sale_id", id).order("line_no"),
    // Cost: a row comes back for admin / store_manager only.
    supabase.from("v_sale_costs").select("total_cost").eq("sale_id", id).maybeSingle(),
    supabase.from("sale_returns").select("*, profiles(full_name), sale_return_items(*)").eq("sale_id", id).order("created_at"),
    supabase.from("app_settings").select("store_name").eq("id", 1).maybeSingle(),
    sale.kosher_body_ids.length ? supabase.from("kosher_bodies").select("name").in("id", sale.kosher_body_ids) : Promise.resolve({ data: [] }),
    getLookups(supabase),
  ]);
  const lines = items ?? [];
  const cancelled = sale.status === "cancelled";
  const canCancel = can(user.role, "sales.cancel") && !cancelled;
  const showProfit = can(user.role, "reports.financial");
  const refunds = (returns ?? []).reduce((s, r) => s + Number(r.refund_amount), 0);

  return (
    <>
      {print === "1" && <AutoPrint />}
      <PageHeader
        icon={Receipt}
        title={`מכירה #${sale.sale_number}`}
        description={`${formatDateTime(sale.created_at)} · ${sale.seller?.full_name ?? ""}`}
        actions={
          <>
            {canCancel && (
              <ReturnItemsButton
                saleId={sale.id}
                locations={lookups.locations}
                items={lines.map((l) => ({
                  id: l.id, product_name: l.products?.name ?? "", batch_number: l.batches?.batch_number ?? "", location_id: l.location_id,
                  qty_kg: Number(l.qty_kg), returned_qty_kg: Number(l.returned_qty_kg), packages: l.packages, returned_packages: l.returned_packages,
                }))}
              />
            )}
            {canCancel && <CancelSaleButton saleId={sale.id} saleNumber={sale.sale_number} />}
            <PrintButton label="הדפסת קבלה" />
            <Button asChild variant="outline" size="lg" className="no-print"><Link href="/sales"><ArrowRight />כל המכירות</Link></Button>
          </>
        }
      />

      {cancelled && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <span className="font-semibold text-destructive">המכירה בוטלה</span> ע״י {sale.canceller?.full_name} ב-{formatDateTime(sale.cancelled_at)} · סיבה: {sale.cancel_reason}
        </div>
      )}

      <Card className="mx-auto max-w-3xl print:max-w-none print:shadow-none print:ring-0">
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <div className="text-xl font-bold">{settings?.store_name}</div>
              <div className="text-sm text-muted-foreground">קבלה פנימית · מכירה #{sale.sale_number}</div>
            </div>
            <div className="text-end text-sm">
              <div className="num">{formatDateTime(sale.created_at)}</div>
              <div className="text-muted-foreground">מוכר: {sale.seller?.full_name}</div>
              {sale.customer_name && <div>לקוח: {sale.customer_name}</div>}
            </div>
          </div>

          {(bodies ?? []).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">דרישת הכשר:</span>
              {(bodies ?? []).map((b) => <Pill key={b.name} tone="primary">{b.name}</Pill>)}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מוצר</TableHead>
                <TableHead>אצווה / הכשר</TableHead>
                <TableHead>משקל</TableHead>
                <TableHead>מחיר לק״ג</TableHead>
                <TableHead>הנחה</TableHead>
                <TableHead className="text-end">סה״כ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.products?.name}</div>
                    {Number(l.returned_qty_kg) > 0 && <Pill tone="warning">הוחזר {formatKg(l.returned_qty_kg)}</Pill>}
                  </TableCell>
                  <TableCell>
                    <Link href={`/batches/${l.batch_id}`} className="ltr font-mono text-xs text-primary hover:underline">{l.batches?.batch_number}</Link>
                    <div className="text-xs text-muted-foreground">{l.batches?.kosher_bodies?.name} · {l.storage_locations?.name}</div>
                  </TableCell>
                  <TableCell className="num">{formatKg(l.qty_kg)}{l.packages ? <div className="text-xs text-muted-foreground">{l.packages} אריזות</div> : null}</TableCell>
                  <TableCell className="num">{formatCurrency(l.price_per_kg)}</TableCell>
                  <TableCell className="num">{Number(l.discount_amount) ? formatCurrency(l.discount_amount) : "—"}</TableCell>
                  <TableCell className="num text-end font-semibold">{formatCurrency(l.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <dl className="ms-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">סכום ביניים</dt><dd className="num">{formatCurrency(sale.subtotal)}</dd></div>
            {Number(sale.items_discount) > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">הנחות שורה</dt><dd className="num">-{formatCurrency(sale.items_discount)}</dd></div>}
            {Number(sale.sale_discount) > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">הנחה כללית</dt><dd className="num">-{formatCurrency(sale.sale_discount)}</dd></div>}
            <div className="flex items-baseline justify-between border-t pt-2"><dt className="font-semibold">סה״כ</dt><dd className="num text-2xl font-extrabold">{formatCurrency(sale.total)}</dd></div>
            {refunds > 0 && <div className="flex justify-between text-warning-foreground dark:text-warning"><dt>החזרים</dt><dd className="num">-{formatCurrency(refunds)}</dd></div>}
            {showProfit && cost && !cancelled && (
              <div className="no-print flex justify-between text-muted-foreground"><dt>רווח גולמי משוער</dt><dd className="num">{formatCurrency(Number(sale.total) - Number(cost.total_cost))}</dd></div>
            )}
          </dl>
          {sale.notes && <p className="border-t pt-3 text-sm"><span className="text-muted-foreground">הערות: </span>{sale.notes}</p>}
        </CardContent>
      </Card>

      {(returns ?? []).length > 0 && (
        <div className="no-print mx-auto mt-6 max-w-3xl space-y-2">
          <h2 className="text-lg font-semibold">החזרות</h2>
          {(returns ?? []).map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-3 text-sm">
              <div className="flex justify-between">
                <span>החזרה #{r.return_number} · {formatDateTime(r.created_at)} · {r.profiles?.full_name}</span>
                <span className="num font-semibold">{formatCurrency(r.refund_amount)}</span>
              </div>
              <div className="text-muted-foreground">סיבה: {r.reason} · {r.sale_return_items.map((i) => `${formatKg(i.qty_kg)} ${i.restocked ? "הוחזר למלאי" : "לא הוחזר למלאי"}`).join(" | ")}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
