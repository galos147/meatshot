import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExpiryBadge, Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockTable } from "@/features/inventory/stock-table";
import { getLookups } from "@/features/lookups";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate, formatKg } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { BatchDocuments, BatchEditButton, BatchLedger, BatchSales } from "./batch-sections";

export const metadata: Metadata = { title: "אצווה" };

export default async function BatchPage({ params }: PageProps<"/batches/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: batch } = await supabase.from("v_batches").select("*").eq("id", id).maybeSingle();
  if (!batch) notFound();

  const [{ data: stock }, { data: txns }, { data: docs }, { data: sales }, { data: certs }, lookups, { data: receipt }] = await Promise.all([
    supabase.from("v_stock").select("*").eq("batch_id", id),
    supabase.from("v_transactions").select("*").eq("batch_id", id).order("created_at", { ascending: false }),
    supabase.from("batch_documents").select("*").eq("batch_id", id).order("created_at", { ascending: false }),
    supabase.from("sale_items").select("id, qty_kg, packages, line_total, sales!inner(id, sale_number, created_at, status, customer_name)").eq("batch_id", id),
    supabase.from("kosher_certificates").select("id, certificate_number, valid_until").eq("kosher_body_id", batch.kosher_body_id!).eq("is_active", true),
    getLookups(supabase),
    batch.receipt_id ? supabase.from("receipts").select("receipt_number").eq("id", batch.receipt_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const info: [string, React.ReactNode][] = [
    ["מוצר", <span key="p" className="font-semibold">{batch.product_name}</span>],
    ["ספק", batch.supplier_name],
    ["לוט ספק", batch.supplier_lot ? <span key="l" className="ltr">{batch.supplier_lot}</span> : "—"],
    ["תאריך ייצור", <span key="pd" className="num">{formatDate(batch.production_date)}</span>],
    ["תאריך קבלה", <span key="rd" className="num">{formatDate(batch.received_date)}</span>],
    ["תפוגה", <ExpiryBadge key="e" date={batch.expiry_date} days={batch.days_to_expiry} />],
    ["כמות שהתקבלה", <span key="q" className="num">{formatKg(batch.initial_qty_kg)} · {batch.initial_packages} אריזות</span>],
    ["במלאי כעת", <span key="n" className="num font-semibold">{formatKg(batch.qty_kg)} · {batch.packages} אריזות</span>],
    ...(can(user.role, "reports.financial")
      ? ([["מחיר עלות לק״ג", <span key="c" className="num">{formatCurrency(batch.cost_price_per_kg)}</span>]] as [string, React.ReactNode][])
      : []),
    [
      "קבלת סחורה",
      receipt ? <Link key="r" href={`/receiving/${batch.receipt_id}`} className="text-primary hover:underline">תעודה #{receipt.receipt_number}</Link> : "—",
    ],
  ];

  return (
    <>
      <PageHeader
        icon={Layers}
        title={`אצווה ${batch.batch_number}`}
        description={`${batch.product_name} · ${batch.kosher_body_name}`}
        actions={
          <>
            {can(user.role, "batch.edit") && (
              <BatchEditButton
                batch={{ id: batch.id!, kosher_certificate_id: batch.kosher_certificate_id, supplier_lot: batch.supplier_lot, production_date: batch.production_date, notes: batch.notes }}
                certificates={(certs ?? []).map((c) => ({ value: c.id, label: `${c.certificate_number} (עד ${formatDate(c.valid_until)})` }))}
              />
            )}
            <Button asChild variant="outline" size="lg"><Link href="/batches"><ArrowRight />כל האצוות</Link></Button>
          </>
        }
      />

      {/* grid-cols-1 = minmax(0,1fr): keeps wide tables scrolling inside their own box on phones */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>פרטי האצווה</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y">
              {info.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-sm text-muted-foreground">{k}</dt>
                  <dd className="text-end text-sm">{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-sm text-muted-foreground">הכשר</dt>
                <dd className="flex flex-col items-end gap-1">
                  <Pill tone="primary">{batch.kosher_body_name}</Pill>
                  {batch.certificate_number ? (
                    <span className="text-xs text-muted-foreground">
                      תעודה {batch.certificate_number} · עד <span className="num">{formatDate(batch.certificate_valid_until)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">ללא תעודה מקושרת</span>
                  )}
                </dd>
              </div>
              {batch.notes && (
                <div className="py-2.5 text-sm"><div className="text-muted-foreground">הערות</div><p className="mt-1 whitespace-pre-wrap">{batch.notes}</p></div>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold">מלאי לפי מיקום</h2>
            <StockTable rows={stock ?? []} locations={lookups.locations} hide={["product"]} />
          </section>
          <BatchDocuments batchId={batch.id!} docs={docs ?? []} canEdit={can(user.role, "batch.edit")} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BatchLedger rows={txns ?? []} />
        <BatchSales rows={(sales ?? []).map((s) => ({ ...s, sale: s.sales }))} />
      </div>
    </>
  );
}
