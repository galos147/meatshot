"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Combobox, type ComboOption } from "@/components/combobox";
import { DataTable } from "@/components/data-table/data-table";
import { TransferDialog, type StockRow } from "@/features/inventory/stock-dialogs";
import { formatDateTime, formatKg } from "@/lib/format";

type Row = {
  id: string;
  transfer_number: number;
  created_at: string;
  batch_id: string;
  batch_number: string;
  product_name: string;
  from_name: string;
  to_name: string;
  qty_kg: number;
  packages: number;
  notes: string | null;
  by: string;
};

export function TransfersTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      data={rows}
      getRowId={(r) => r.id}
      searchText={(r) => `${r.transfer_number} ${r.batch_number} ${r.product_name} ${r.from_name} ${r.to_name}`}
      searchPlaceholder="חיפוש לפי אצווה, מוצר, מקרר..."
      columns={[
        { id: "num", header: "מס׳", sortValue: (r) => r.transfer_number, cell: (r) => <span className="num text-muted-foreground">#{r.transfer_number}</span> },
        { id: "when", header: "מועד", sortValue: (r) => r.created_at, cell: (r) => <span className="num text-sm">{formatDateTime(r.created_at)}</span> },
        {
          id: "product",
          header: "מוצר / אצווה",
          cell: (r) => (
            <div>
              <div className="font-medium">{r.product_name}</div>
              <Link href={`/batches/${r.batch_id}`} className="ltr font-mono text-xs text-primary hover:underline">{r.batch_number}</Link>
            </div>
          ),
        },
        {
          id: "route",
          header: "מ־ → אל",
          cell: (r) => (
            <span className="inline-flex items-center gap-2 text-sm">
              {r.from_name}<ArrowLeft className="size-4 text-primary" />{r.to_name}
            </span>
          ),
        },
        { id: "qty", header: "כמות", sortValue: (r) => r.qty_kg, cell: (r) => <span className="num">{formatKg(r.qty_kg)}{r.packages ? ` · ${r.packages} אר׳` : ""}</span> },
        { id: "by", header: "עובד", hideOnMobile: true, cell: (r) => r.by },
        { id: "notes", header: "הערות", hideOnMobile: true, cell: (r) => <span className="text-sm text-muted-foreground">{r.notes ?? ""}</span> },
      ]}
      emptyTitle="עדיין לא בוצעו העברות"
    />
  );
}

/** Pick a stock row (batch in a location), then open the transfer dialog for it. */
export function NewTransferButton({ stock, locations }: { stock: StockRow[]; locations: ComboOption[] }) {
  const [open, setOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const row = stock.find((s) => `${s.batch_id}:${s.location_id}` === selected);

  return (
    <>
      <Button size="lg" onClick={() => { setSelected(null); setOpen(true); }} className="shadow-sm shadow-primary/25">
        <ArrowLeftRight />העברה חדשה
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>העברה חדשה</DialogTitle>
            <DialogDescription>בחרו את האצווה והמקרר שממנו מעבירים</DialogDescription>
          </DialogHeader>
          <Combobox
            options={stock.map((s) => ({
              value: `${s.batch_id}:${s.location_id}`,
              label: `${s.product_name} · ${s.batch_number}`,
              hint: `${s.location_name} · ${formatKg(s.qty_kg)}`,
              keywords: [s.batch_number, s.location_name],
            }))}
            value={selected}
            onChange={setSelected}
            placeholder="חיפוש מוצר או אצווה"
          />
          <Button size="lg" className="w-full" disabled={!row} onClick={() => { setOpen(false); setTransferOpen(true); }}>
            המשך להעברה
          </Button>
        </DialogContent>
      </Dialog>
      {row && <TransferDialog row={row} locations={locations} open={transferOpen} onOpenChange={setTransferOpen} />}
    </>
  );
}
