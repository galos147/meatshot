"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import { ExpiryBadge, Pill } from "@/components/status";
import { formatDate, formatKg } from "@/lib/format";
import type { Tables } from "@/types/database";

type Row = Tables<"v_batches">;
type Option = { value: string; label: string };

export function BatchesTable({
  rows,
  products,
  kosherBodies,
  suppliers,
  initialProduct,
}: {
  rows: Row[];
  products: Option[];
  kosherBodies: Option[];
  suppliers: Option[];
  initialProduct?: string;
}) {
  const router = useRouter();
  return (
    <DataTable
      data={rows}
      getRowId={(r) => r.id!}
      onRowClick={(r) => router.push(`/batches/${r.id}`)}
      searchText={(r) => [r.batch_number, r.supplier_lot, r.product_name, r.sku, r.supplier_name, r.kosher_body_name, r.certificate_number].join(" ")}
      searchPlaceholder="חיפוש לפי מספר אצווה, מוצר, ספק..."
      initialFilters={{ stock: "in", ...(initialProduct ? { product: initialProduct } : {}) }}
      filters={[
        { id: "stock", label: "אצוות", options: [{ value: "in", label: "במלאי בלבד" }, { value: "empty", label: "שנגמרו" }], value: (r) => (Number(r.qty_kg) > 0 ? "in" : "empty") },
        { id: "product", label: "מוצרים", options: products, value: (r) => r.product_id },
        { id: "kosher", label: "הכשרים", options: kosherBodies, value: (r) => r.kosher_body_id },
        { id: "supplier", label: "ספקים", options: suppliers, value: (r) => r.supplier_id },
      ]}
      columns={[
        {
          id: "batch",
          header: "אצווה",
          sortValue: (r) => r.batch_number,
          cell: (r) => (
            <div>
              <div className="ltr text-end font-mono text-sm font-semibold text-primary">{r.batch_number}</div>
              {r.supplier_lot && <div className="text-xs text-muted-foreground">לוט ספק: <span className="ltr">{r.supplier_lot}</span></div>}
            </div>
          ),
        },
        { id: "product", header: "מוצר", sortValue: (r) => r.product_name, cell: (r) => <span className="font-medium">{r.product_name}</span> },
        { id: "supplier", header: "ספק", hideOnMobile: true, sortValue: (r) => r.supplier_name, cell: (r) => r.supplier_name },
        {
          id: "kosher",
          header: "הכשר",
          cell: (r) => (
            <div className="flex flex-col items-start gap-0.5">
              <Pill tone="primary">{r.kosher_body_name}</Pill>
              {r.certificate_number && <span className="text-xs text-muted-foreground">תעודה {r.certificate_number}</span>}
            </div>
          ),
        },
        { id: "received", header: "התקבל", hideOnMobile: true, sortValue: (r) => r.received_date, cell: (r) => <span className="num">{formatDate(r.received_date)}</span> },
        { id: "expiry", header: "תפוגה", sortValue: (r) => r.expiry_date, cell: (r) => <ExpiryBadge date={r.expiry_date} days={r.days_to_expiry} /> },
        {
          id: "qty",
          header: "במלאי / התקבל",
          sortValue: (r) => Number(r.qty_kg),
          cell: (r) => (
            <div>
              <div className="num font-semibold">{formatKg(r.qty_kg)}</div>
              <div className="num text-xs text-muted-foreground">מתוך {formatKg(r.initial_qty_kg)}</div>
            </div>
          ),
        },
        {
          id: "loc",
          header: "מיקומים",
          hideOnMobile: true,
          cell: (r) => (r.location_names?.length ? r.location_names.join(", ") : <span className="text-muted-foreground">—</span>),
        },
      ]}
      rowClassName={(r) => (Number(r.qty_kg) === 0 ? "opacity-60" : undefined)}
      emptyTitle="אין אצוות"
      emptyDescription="אצוות נוצרות אוטומטית בקבלת סחורה"
    />
  );
}
