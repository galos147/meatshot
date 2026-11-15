"use client";

import Link from "next/link";
import { DataTable, type Column, type Filter } from "@/components/data-table/data-table";
import type { ComboOption } from "@/components/combobox";
import { ExpiryBadge, Pill } from "@/components/status";
import { useCan } from "@/components/shell/user-context";
import { formatCurrency, formatKg } from "@/lib/format";
import { BLOCK_REASON_LABELS } from "./labels";
import { AdjustDialog, TransferDialog } from "./stock-dialogs";
import type { Tables } from "@/types/database";

export type StockViewRow = Tables<"v_stock">;
type Option = { value: string; label: string };

const sum = (rows: StockViewRow[], f: (r: StockViewRow) => number) => rows.reduce((s, r) => s + f(r), 0);

export function StockTable({
  rows,
  locations,
  hide = [],
  filterOptions = {},
}: {
  rows: StockViewRow[];
  locations: ComboOption[];
  hide?: ("location" | "warehouse" | "product")[];
  /** Serializable option lists; the filters themselves are built here (client side). */
  filterOptions?: { warehouses?: Option[]; locations?: Option[]; kosherBodies?: Option[] };
}) {
  const filters: Filter<StockViewRow>[] = [];
  if (filterOptions.warehouses) filters.push({ id: "wh", label: "מחסנים", options: filterOptions.warehouses, value: (r) => r.warehouse_id });
  if (filterOptions.locations) filters.push({ id: "loc", label: "מיקומים", options: filterOptions.locations, value: (r) => r.location_id });
  if (filterOptions.kosherBodies) filters.push({ id: "kosher", label: "הכשרים", options: filterOptions.kosherBodies, value: (r) => r.kosher_body_id });

  const canMove = useCan("stock.move");
  const canSeeCost = useCan("reports.financial");

  const statusFilter: Filter<StockViewRow> = {
    id: "status",
    label: "מצבים",
    options: [
      { value: "expired", label: "פג תוקף" },
      { value: "3", label: "תפוגה עד 3 ימים" },
      { value: "7", label: "תפוגה עד 7 ימים" },
      { value: "14", label: "תפוגה עד 14 ימים" },
      { value: "blocked", label: "חסום למכירה" },
    ],
    value: (r) => {
      const d = r.days_to_expiry ?? 999;
      const out: string[] = [];
      if (d < 0) out.push("expired");
      if (d >= 0 && d <= 3) out.push("3");
      if (d >= 0 && d <= 7) out.push("7");
      if (d >= 0 && d <= 14) out.push("14");
      if (!r.is_sellable) out.push("blocked");
      return out;
    },
  };

  const columns: Column<StockViewRow>[] = [
    ...(hide.includes("product")
      ? []
      : [{
          id: "product",
          header: "מוצר",
          sortValue: (r: StockViewRow) => r.product_name,
          cell: (r: StockViewRow) => (
            <div>
              <div className="font-medium">{r.product_name}</div>
              <div className="text-xs text-muted-foreground">{r.category_name ?? ""}</div>
            </div>
          ),
        }]),
    {
      id: "batch",
      header: "אצווה",
      sortValue: (r) => r.batch_number,
      cell: (r) => (
        <Link href={`/batches/${r.batch_id}`} onClick={(e) => e.stopPropagation()} className="ltr font-mono text-xs font-medium text-primary hover:underline">
          {r.batch_number}
        </Link>
      ),
    },
    { id: "kosher", header: "הכשר", sortValue: (r) => r.kosher_body_name, cell: (r) => <Pill tone="primary">{r.kosher_body_name}</Pill> },
    ...(hide.includes("location")
      ? []
      : [{
          id: "location",
          header: "מיקום",
          sortValue: (r: StockViewRow) => r.location_name,
          cell: (r: StockViewRow) => (
            <div>
              <div>{r.location_name}</div>
              {!hide.includes("warehouse") && <div className="text-xs text-muted-foreground">{r.warehouse_name}</div>}
            </div>
          ),
        }]),
    {
      id: "expiry",
      header: "תפוגה",
      sortValue: (r) => r.expiry_date,
      cell: (r) => (
        <div className="flex flex-col gap-1">
          <ExpiryBadge date={r.expiry_date} days={r.days_to_expiry} />
          {r.sell_block_reason && r.sell_block_reason !== "ok" && r.sell_block_reason !== "expired" && (
            <Pill tone="danger">{BLOCK_REASON_LABELS[r.sell_block_reason]}</Pill>
          )}
        </div>
      ),
    },
    {
      id: "qty",
      header: "כמות",
      sortValue: (r) => Number(r.qty_kg),
      cell: (r) => (
        <div>
          <div className="num font-semibold">{formatKg(r.qty_kg)}</div>
          <div className="text-xs text-muted-foreground">{r.packages} אריזות</div>
        </div>
      ),
      footer: (rs) => <span className="num">{formatKg(sum(rs, (r) => Number(r.qty_kg)))}</span>,
    },
    ...(canSeeCost
      ? [{
          id: "value",
          header: "שווי עלות",
          hideOnMobile: true,
          sortValue: (r: StockViewRow) => Number(r.cost_value),
          cell: (r: StockViewRow) => <span className="num">{formatCurrency(r.cost_value)}</span>,
          footer: (rs: StockViewRow[]) => <span className="num">{formatCurrency(sum(rs, (r) => Number(r.cost_value)))}</span>,
        }]
      : []),
    ...(canMove
      ? [{
          id: "actions",
          header: "",
          className: "text-end",
          cell: (r: StockViewRow) => {
            const row = {
              batch_id: r.batch_id!, location_id: r.location_id!, batch_number: r.batch_number!, product_name: r.product_name!,
              location_name: r.location_name!, qty_kg: Number(r.qty_kg), packages: r.packages ?? 0,
            };
            return (
              <div className="flex justify-end gap-1">
                <TransferDialog row={row} locations={locations} />
                <AdjustDialog row={row} />
              </div>
            );
          },
        }]
      : []),
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => `${r.batch_id}:${r.location_id}`}
      searchText={(r) => [r.product_name, r.sku, r.barcode, r.batch_number, r.supplier_lot, r.location_name, r.kosher_body_name, r.supplier_name].join(" ")}
      searchPlaceholder='חיפוש מוצר, מק"ט, אצווה...'
      filters={[...filters, statusFilter]}
      defaultSort={{ id: "expiry", dir: "asc" }}
      rowClassName={(r) => ((r.days_to_expiry ?? 0) < 0 ? "bg-destructive/[0.04]" : undefined)}
      emptyTitle="אין מלאי"
      emptyDescription="מלאי נכנס דרך מסך קבלת סחורה"
    />
  );
}

