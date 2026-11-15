"use client";

import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { ExpiryBadge, Pill } from "@/components/status";
import { useCan } from "@/components/shell/user-context";
import { formatCurrency, formatKg, todayIso } from "@/lib/format";
import type { Tables } from "@/types/database";

type Row = Tables<"v_product_stock">;

export function ProductStockTable({ rows, categories }: { rows: Row[]; categories: { value: string; label: string }[] }) {
  const router = useRouter();
  const canSeeCost = useCan("reports.financial");
  const today = todayIso();
  const days = (d: string | null) => (d ? Math.round((Date.parse(d) - Date.parse(today)) / 86_400_000) : null);

  return (
    <DataTable
      data={rows}
      getRowId={(r) => r.product_id!}
      onRowClick={(r) => router.push(`/batches?product=${r.product_id}`)}
      searchText={(r) => [r.product_name, r.sku, r.barcode, r.category_name].join(" ")}
      searchPlaceholder='חיפוש מוצר, מק"ט, ברקוד...'
      filters={[
        { id: "cat", label: "קטגוריות", options: categories, value: (r) => r.category_id },
        {
          id: "state",
          label: "מצבים",
          options: [
            { value: "low", label: "מלאי נמוך" },
            { value: "empty", label: "אזל" },
            { value: "in", label: "במלאי" },
          ],
          value: (r) => (Number(r.qty_kg) === 0 ? "empty" : r.is_low_stock ? ["low", "in"] : "in"),
        },
      ]}
      defaultSort={{ id: "name", dir: "asc" }}
      columns={[
        {
          id: "name",
          header: "מוצר",
          sortValue: (r) => r.product_name,
          cell: (r) => (
            <div>
              <div className="font-medium">{r.product_name}</div>
              <div className="ltr text-end font-mono text-xs text-muted-foreground">{r.sku}</div>
            </div>
          ),
        },
        { id: "cat", header: "קטגוריה", hideOnMobile: true, cell: (r) => r.category_name ?? "—" },
        {
          id: "qty",
          header: "סה״כ במלאי",
          sortValue: (r) => Number(r.qty_kg),
          cell: (r) => (
            <div>
              <div className="num font-semibold">{formatKg(r.qty_kg)}</div>
              <div className="text-xs text-muted-foreground">{r.packages} אריזות · {r.batch_count} אצוות</div>
            </div>
          ),
          footer: (rs) => <span className="num">{formatKg(rs.reduce((s, r) => s + Number(r.qty_kg), 0))}</span>,
        },
        {
          id: "sellable",
          header: "כשיר למכירה",
          sortValue: (r) => Number(r.sellable_qty_kg),
          cell: (r) => (
            <div className="flex flex-col items-start gap-1">
              <span className="num">{formatKg(r.sellable_qty_kg)}</span>
              {Number(r.qty_kg) === 0 ? (
                <Pill>אזל</Pill>
              ) : r.is_low_stock ? (
                <Pill tone="warning"><TriangleAlert />מתחת למינימום ({formatKg(r.min_stock_kg)})</Pill>
              ) : null}
            </div>
          ),
        },
        {
          id: "expiry",
          header: "תפוגה קרובה",
          sortValue: (r) => r.nearest_expiry,
          cell: (r) => (r.nearest_expiry ? <ExpiryBadge date={r.nearest_expiry} days={days(r.nearest_expiry)} /> : "—"),
        },
        ...(canSeeCost
          ? [{
              id: "value",
              header: "שווי עלות",
              hideOnMobile: true,
              sortValue: (r: Row) => Number(r.cost_value),
              cell: (r: Row) => <span className="num">{formatCurrency(r.cost_value)}</span>,
              footer: (rs: Row[]) => <span className="num">{formatCurrency(rs.reduce((s, r) => s + Number(r.cost_value), 0))}</span>,
            }]
          : []),
      ]}
      emptyTitle="אין מוצרים פעילים"
    />
  );
}
