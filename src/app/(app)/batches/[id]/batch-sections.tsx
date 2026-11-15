"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EntityDialog } from "@/components/crud/entity-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { FileUploadButton, OpenFileButton } from "@/components/file-upload";
import { Pill } from "@/components/status";
import { addBatchDocument, deleteBatchDocument, updateBatch } from "@/features/inventory/actions";
import { TXN_LABELS, TXN_TONES } from "@/features/inventory/labels";
import { batchEditSchema } from "@/features/inventory/schemas";
import { formatCurrency, formatDateTime, formatKg } from "@/lib/format";
import type { Tables } from "@/types/database";

export function BatchEditButton({
  batch,
  certificates,
}: {
  batch: { id: string; kosher_certificate_id: string | null; supplier_lot: string | null; production_date: string | null; notes: string | null };
  certificates: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="lg" onClick={() => setOpen(true)}><Pencil />עריכה</Button>
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title="עריכת אצווה"
        description="מוצר, הכשר, תפוגה וכמויות אינם ניתנים לשינוי. לתיקון כמות השתמשו בהתאמת מלאי."
        schema={batchEditSchema as unknown as z.ZodType<Record<string, unknown>, Record<string, unknown>>}
        fields={[
          { name: "kosher_certificate_id", label: "תעודת הכשר", type: "select", options: certificates, allowEmpty: true, description: "רק תעודות של גוף ההכשר של האצווה" },
          { name: "supplier_lot", label: "לוט ספק", type: "text", ltr: true },
          { name: "production_date", label: "תאריך ייצור", type: "date" },
          { name: "notes", label: "הערות", type: "textarea" },
        ]}
        defaultValues={{
          kosher_certificate_id: batch.kosher_certificate_id,
          supplier_lot: batch.supplier_lot ?? "",
          production_date: batch.production_date ?? "",
          notes: batch.notes ?? "",
        }}
        onSubmit={(values) => updateBatch(batch.id, values)}
      />
    </>
  );
}

const DOC_TYPES: Record<string, string> = { kosher: "תעודת הכשר", delivery: "תעודת משלוח", lab: "בדיקת מעבדה", other: "אחר" };

export function BatchDocuments({ batchId, docs, canEdit }: { batchId: string; docs: Tables<"batch_documents">[]; canEdit: boolean }) {
  const [docType, setDocType] = useState("kosher");
  return (
    <Card>
      <CardHeader>
        <CardTitle>תעודות ומסמכים</CardTitle>
        {canEdit && (
          <CardAction className="flex items-center gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="h-8 rounded-lg border bg-background px-2 text-sm"
              aria-label="סוג מסמך"
            >
              {Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <FileUploadButton
              bucket="documents"
              folder={`batches/${batchId}`}
              accept="application/pdf,image/*"
              label="העלאה"
              onUploaded={async (path, file) => {
                const res = await addBatchDocument(batchId, path, file.name, docType);
                if (res.ok) toast.success("המסמך נשמר");
                else toast.error(res.error);
              }}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">לא הועלו מסמכים לאצווה זו</p>
        ) : (
          <ul className="divide-y">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <FileText className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">{DOC_TYPES[d.doc_type] ?? d.doc_type} · <span className="num">{formatDateTime(d.created_at)}</span></div>
                </div>
                <OpenFileButton bucket="documents" path={d.file_path} />
                {canEdit && (
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon" aria-label="מחיקה"><Trash2 /></Button>}
                    title="למחוק את המסמך?"
                    destructive
                    confirmLabel="מחיקה"
                    onConfirm={() => deleteBatchDocument(d.id)}
                    successMessage="המסמך נמחק"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function BatchLedger({ rows }: { rows: Tables<"v_transactions">[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">היסטוריית תנועות</h2>
      <DataTable
        data={rows}
        getRowId={(r) => String(r.id)}
        pageSize={10}
        columns={[
          { id: "when", header: "מועד", cell: (r) => <span className="num text-xs">{formatDateTime(r.created_at)}</span> },
          { id: "type", header: "סוג", cell: (r) => <Pill tone={TXN_TONES[r.txn_type!]}>{TXN_LABELS[r.txn_type!]}</Pill> },
          { id: "loc", header: "מיקום", hideOnMobile: true, cell: (r) => r.location_name },
          {
            id: "qty",
            header: "שינוי",
            cell: (r) => (
              <span className={`num font-medium ${Number(r.qty_kg_delta) < 0 ? "text-destructive" : "text-[oklch(0.45_0.11_155)]"}`}>
                {Number(r.qty_kg_delta) > 0 ? "+" : ""}{formatKg(r.qty_kg_delta)}
              </span>
            ),
          },
          { id: "by", header: "עובד", hideOnMobile: true, cell: (r) => r.created_by_name },
        ]}
        emptyTitle="אין תנועות"
      />
    </section>
  );
}

type SaleRow = {
  id: string;
  qty_kg: number;
  packages: number;
  line_total: number;
  sale: { id: string; sale_number: number; created_at: string; status: string; customer_name: string | null };
};

export function BatchSales({ rows }: { rows: SaleRow[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">נמכר מאצווה זו <span className="text-sm font-normal text-muted-foreground">(מעקב לצורך ריקול)</span></h2>
      <DataTable
        data={rows}
        getRowId={(r) => r.id}
        pageSize={10}
        columns={[
          {
            id: "sale",
            header: "מכירה",
            cell: (r) => <Link href={`/sales/${r.sale.id}`} className="font-medium text-primary hover:underline">#{r.sale.sale_number}</Link>,
          },
          { id: "when", header: "מועד", cell: (r) => <span className="num text-xs">{formatDateTime(r.sale.created_at)}</span> },
          { id: "cust", header: "לקוח", hideOnMobile: true, cell: (r) => r.sale.customer_name ?? "—" },
          { id: "qty", header: "כמות", cell: (r) => <span className="num">{formatKg(r.qty_kg)}</span> },
          { id: "total", header: "סכום", cell: (r) => <span className="num">{formatCurrency(r.line_total)}</span> },
          { id: "st", header: "", cell: (r) => (r.sale.status === "cancelled" ? <Pill tone="neutral">בוטלה</Pill> : null) },
        ]}
        emptyTitle="לא נמכר מאצווה זו"
      />
    </section>
  );
}
