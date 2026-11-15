"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import { formatCurrency, formatDate, formatKg } from "@/lib/format";

type Row = {
  id: string;
  receipt_number: number;
  received_date: string;
  delivery_note_number: string | null;
  supplier_id: string;
  supplier_name: string;
  created_by_name: string;
  lines: number;
  kg: number;
  cost: number;
};

export function ReceiptsTable({ rows, showCost }: { rows: Row[]; showCost: boolean }) {
  const router = useRouter();
  const suppliers = [...new Map(rows.map((r) => [r.supplier_id, r.supplier_name])).entries()].map(([value, label]) => ({ value, label }));
  return (
    <DataTable
      data={rows}
      getRowId={(r) => r.id}
      onRowClick={(r) => router.push(`/receiving/${r.id}`)}
      searchText={(r) => `${r.receipt_number} ${r.supplier_name} ${r.delivery_note_number ?? ""}`}
      searchPlaceholder="חיפוש לפי מספר, ספק, תעודת משלוח..."
      filters={[{ id: "supplier", label: "ספקים", options: suppliers, value: (r) => r.supplier_id }]}
      columns={[
        { id: "num", header: "מס׳ קבלה", sortValue: (r) => r.receipt_number, cell: (r) => <span className="num font-semibold text-primary">#{r.receipt_number}</span> },
        { id: "date", header: "תאריך", sortValue: (r) => r.received_date, cell: (r) => <span className="num">{formatDate(r.received_date)}</span> },
        { id: "supplier", header: "ספק", sortValue: (r) => r.supplier_name, cell: (r) => <span className="font-medium">{r.supplier_name}</span> },
        { id: "dn", header: "תעודת משלוח", hideOnMobile: true, cell: (r) => <span className="ltr">{r.delivery_note_number ?? "—"}</span> },
        { id: "lines", header: "אצוות", sortValue: (r) => r.lines, cell: (r) => <span className="num">{r.lines}</span> },
        { id: "kg", header: "משקל", sortValue: (r) => r.kg, cell: (r) => <span className="num">{formatKg(r.kg)}</span>, footer: (rs) => <span className="num">{formatKg(rs.reduce((s, r) => s + r.kg, 0))}</span> },
        ...(showCost
          ? [{ id: "cost", header: "עלות", hideOnMobile: true, sortValue: (r: Row) => r.cost, cell: (r: Row) => <span className="num">{formatCurrency(r.cost)}</span>, footer: (rs: Row[]) => <span className="num">{formatCurrency(rs.reduce((s, r) => s + r.cost, 0))}</span> }]
          : []),
        { id: "by", header: "נקלט ע״י", hideOnMobile: true, cell: (r) => r.created_by_name },
      ]}
      emptyTitle="עדיין לא התקבלה סחורה"
      emptyDescription='לחצו על "קבלה חדשה" כדי לרשום משלוח'
    />
  );
}
