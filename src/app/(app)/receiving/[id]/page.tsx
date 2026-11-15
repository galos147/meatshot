import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExpiryBadge, Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime, formatKg } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "קבלת סחורה" };

export default async function ReceiptPage({ params }: PageProps<"/receiving/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: receipt } = await supabase.from("receipts").select("*, suppliers(name), profiles(full_name)").eq("id", id).maybeSingle();
  if (!receipt) notFound();
  const { data: batches } = await supabase.from("v_batches").select("*").eq("receipt_id", id).order("batch_number");
  const { data: txns } = await supabase.from("inventory_transactions").select("batch_id, location_id, storage_locations(name)").eq("ref_id", id).eq("txn_type", "receipt");
  const locByBatch = new Map((txns ?? []).map((t) => [t.batch_id, t.storage_locations?.name]));
  const showCost = can(user.role, "reports.financial");
  const rows = batches ?? [];
  const totalKg = rows.reduce((s, b) => s + Number(b.initial_qty_kg), 0);
  const totalCost = rows.reduce((s, b) => s + Number(b.initial_qty_kg) * Number(b.cost_price_per_kg), 0);

  return (
    <>
      <PageHeader
        icon={PackageCheck}
        title={`קבלת סחורה #${receipt.receipt_number}`}
        description={`${receipt.suppliers?.name} · ${formatDate(receipt.received_date)}`}
        actions={
          <>
            <PrintButton />
            <Button asChild variant="outline" size="lg"><Link href="/receiving"><ArrowRight />כל הקבלות</Link></Button>
          </>
        }
      />
      <Card className="mb-6">
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["ספק", receipt.suppliers?.name],
            ["תאריך קבלה", formatDate(receipt.received_date)],
            ["תעודת משלוח", receipt.delivery_note_number ?? "—"],
            ["נקלט ע״י", `${receipt.profiles?.full_name ?? ""} · ${formatDateTime(receipt.created_at)}`],
          ].map(([k, v]) => (
            <div key={k}><div className="text-xs text-muted-foreground">{k}</div><div className="mt-0.5 font-medium">{v}</div></div>
          ))}
          {receipt.notes && <div className="sm:col-span-4"><div className="text-xs text-muted-foreground">הערות</div><p className="mt-0.5">{receipt.notes}</p></div>}
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>אצווה</TableHead>
              <TableHead>מוצר</TableHead>
              <TableHead>הכשר</TableHead>
              <TableHead>תפוגה</TableHead>
              <TableHead>מיקום</TableHead>
              <TableHead>משקל</TableHead>
              <TableHead>אריזות</TableHead>
              {showCost && <TableHead>עלות</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell><Link href={`/batches/${b.id}`} className="ltr font-mono text-sm font-semibold text-primary hover:underline">{b.batch_number}</Link></TableCell>
                <TableCell className="font-medium">{b.product_name}</TableCell>
                <TableCell><Pill tone="primary">{b.kosher_body_name}</Pill></TableCell>
                <TableCell><ExpiryBadge date={b.expiry_date} days={b.days_to_expiry} /></TableCell>
                <TableCell>{locByBatch.get(b.id!) ?? "—"}</TableCell>
                <TableCell className="num">{formatKg(b.initial_qty_kg)}</TableCell>
                <TableCell className="num">{b.initial_packages}</TableCell>
                {showCost && <TableCell className="num">{formatCurrency(Number(b.initial_qty_kg) * Number(b.cost_price_per_kg))}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="font-semibold">סה״כ</TableCell>
              <TableCell className="num font-semibold">{formatKg(totalKg)}</TableCell>
              <TableCell className="num font-semibold">{rows.reduce((s, b) => s + (b.initial_packages ?? 0), 0)}</TableCell>
              {showCost && <TableCell className="num font-semibold">{formatCurrency(totalCost)}</TableCell>}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="no-print mt-3 text-sm text-muted-foreground">
        טעות בקבלה? מבטלים את תנועת הקבלה ביומן התנועות (מנהל), ואז קולטים מחדש.
      </p>
    </>
  );
}
