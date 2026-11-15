"use client";

import Link from "next/link";
import { CheckCircle2, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDateTime, formatKg } from "@/lib/format";
import { lineAmounts, type cartTotals } from "@/lib/pricing";
import type { CartLine } from "./pos-types";

export type CompletedSale = {
  id: string;
  saleNumber: number;
  total: number;
  createdAt: string;
  lines: CartLine[];
  totals: ReturnType<typeof cartTotals>;
  customer: string;
  kosherNames: string[];
};

export function SaleCompleteDialog({ sale, onNewSale }: { sale: CompletedSale | null; onNewSale: () => void }) {
  return (
    <Dialog open={!!sale} onOpenChange={(o) => !o && onNewSale()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <div className="mb-2 grid size-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-9" />
          </div>
          <DialogTitle className="text-2xl">המכירה נרשמה</DialogTitle>
          <DialogDescription>מכירה #{sale?.saleNumber} · {formatDateTime(sale?.createdAt)}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-muted/30 p-4">
          <ul className="space-y-1.5 text-sm">
            {sale?.lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-2">
                <span className="truncate">{l.productName} <span className="num text-muted-foreground">({formatKg(l.qtyKg)})</span></span>
                <span className="num">{formatCurrency(lineAmounts({ qtyKg: l.qtyKg, pricePerKg: l.pricePerKg, discount: l.discount }).total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t pt-3">
            <span className="font-semibold">סה״כ</span>
            <span className="num text-2xl font-extrabold">{formatCurrency(sale?.total)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="lg" className="h-12">
            <Link href={sale ? `/sales/${sale.id}?print=1` : "#"} target="_blank"><Printer />קבלה</Link>
          </Button>
          <Button size="lg" className="h-12" onClick={onNewSale} autoFocus><Plus />מכירה חדשה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
