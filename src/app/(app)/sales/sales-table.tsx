"use client";

import { usePathname, useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/status";
import { formatCurrency, formatDateTime, formatKg } from "@/lib/format";

type Row = {
  id: string;
  sale_number: number;
  created_at: string;
  status: "completed" | "cancelled";
  total: number;
  discount: number;
  refunds: number;
  cost: number;
  kg: number;
  lines: number;
  customer_name: string | null;
  seller: string;
  seller_id: string;
};

const active = (rows: Row[]) => rows.filter((r) => r.status === "completed");

export function SalesTable({ rows, from, to, showProfit }: { rows: Row[]; from: string; to: string; showProfit: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sellers = [...new Map(rows.map((r) => [r.seller_id, r.seller])).entries()].map(([value, label]) => ({ value, label }));
  const setRange = (f: string, t: string) => router.push(`${pathname}?from=${f}&to=${t}`);

  return (
    <DataTable
      data={rows}
      getRowId={(r) => r.id}
      onRowClick={(r) => router.push(`/sales/${r.id}`)}
      searchText={(r) => `${r.sale_number} ${r.customer_name ?? ""} ${r.seller}`}
      searchPlaceholder="חיפוש לפי מספר מכירה, לקוח, מוכר..."
      filters={[
        { id: "status", label: "סטטוסים", options: [{ value: "completed", label: "הושלמה" }, { value: "cancelled", label: "בוטלה" }], value: (r) => r.status },
        { id: "seller", label: "מוכרים", options: sellers, value: (r) => r.seller_id },
      ]}
      toolbar={
        <div className="flex items-center gap-2 text-sm">
          <Input type="date" value={from} onChange={(e) => setRange(e.target.value, to)} className="h-10 w-38 bg-card" aria-label="מתאריך" />
          <span className="text-muted-foreground">עד</span>
          <Input type="date" value={to} onChange={(e) => setRange(from, e.target.value)} className="h-10 w-38 bg-card" aria-label="עד תאריך" />
        </div>
      }
      rowClassName={(r) => (r.status === "cancelled" ? "opacity-55" : undefined)}
      columns={[
        { id: "num", header: "מס׳", sortValue: (r) => r.sale_number, cell: (r) => <span className="num font-semibold text-primary">#{r.sale_number}</span> },
        { id: "when", header: "מועד", sortValue: (r) => r.created_at, cell: (r) => <span className="num text-sm">{formatDateTime(r.created_at)}</span> },
        { id: "seller", header: "מוכר", hideOnMobile: true, cell: (r) => r.seller },
        { id: "customer", header: "לקוח", hideOnMobile: true, cell: (r) => r.customer_name ?? "—" },
        { id: "kg", header: "משקל", hideOnMobile: true, sortValue: (r) => r.kg, cell: (r) => <span className="num">{formatKg(r.kg)}</span>, footer: (rs) => <span className="num">{formatKg(active(rs).reduce((s, r) => s + r.kg, 0))}</span> },
        {
          id: "total",
          header: "סכום",
          sortValue: (r) => r.total,
          cell: (r) => (
            <div>
              <div className="num font-semibold">{formatCurrency(r.total)}</div>
              {r.refunds > 0 && <div className="num text-xs text-warning-foreground dark:text-warning">הוחזר {formatCurrency(r.refunds)}</div>}
            </div>
          ),
          footer: (rs) => <span className="num">{formatCurrency(active(rs).reduce((s, r) => s + r.total - r.refunds, 0))}</span>,
        },
        ...(showProfit
          ? [{
              id: "profit",
              header: "רווח גולמי",
              hideOnMobile: true,
              sortValue: (r: Row) => r.total - r.cost,
              cell: (r: Row) => <span className="num text-sm">{r.status === "completed" ? formatCurrency(r.total - r.cost) : "—"}</span>,
              footer: (rs: Row[]) => <span className="num">{formatCurrency(active(rs).reduce((s, r) => s + r.total - r.cost, 0))}</span>,
            }]
          : []),
        { id: "status", header: "סטטוס", cell: (r) => (r.status === "cancelled" ? <Pill tone="neutral">בוטלה</Pill> : r.refunds > 0 ? <Pill tone="warning">החזרה חלקית</Pill> : <Pill tone="success">הושלמה</Pill>) },
      ]}
      emptyTitle="אין מכירות בטווח התאריכים"
    />
  );
}
