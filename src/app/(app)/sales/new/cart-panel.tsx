"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createSale } from "@/features/sales/actions";
import { formatCurrency, formatDate, formatKg } from "@/lib/format";
import { cartTotals, lineAmounts, round2 } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { CartLine, Option } from "./pos-types";
import type { CompletedSale } from "./sale-complete-dialog";

export function CartPanel({
  cart,
  mismatched,
  kosherIds,
  kosherBodies,
  saleKey,
  onRemove,
  onClear,
  onCompleted,
}: {
  cart: CartLine[];
  mismatched: Set<string>;
  kosherIds: string[];
  kosherBodies: Option[];
  saleKey: string;
  onRemove: (key: string) => void;
  onClear: () => void;
  onCompleted: (sale: CompletedSale) => void;
}) {
  const [saleDiscount, setSaleDiscount] = useState("");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totals = cartTotals(cart.map((l) => ({ qtyKg: l.qtyKg, pricePerKg: l.pricePerKg, discount: l.discount })), Number(saleDiscount) || 0);
  const totalKg = cart.reduce((s, l) => s + l.qtyKg, 0);
  const blocked = mismatched.size > 0;

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await createSale({
        idempotency_key: saleKey,
        kosher_body_ids: kosherIds,
        items: cart.map((l) => ({ batch_id: l.batchId, location_id: l.locationId, qty_kg: l.qtyKg, packages: l.packages, discount_amount: l.discount })),
        sale_discount: totals.saleDiscount,
        customer_name: customer,
        notes,
      });
      if (res.ok) {
        onCompleted({
          id: res.data.id,
          saleNumber: res.data.sale_number,
          total: Number(res.data.total),
          createdAt: res.data.created_at,
          lines: cart,
          totals,
          customer,
          kosherNames: kosherBodies.filter((b) => kosherIds.includes(b.value)).map((b) => b.label),
        });
        setSaleDiscount("");
        setCustomer("");
        setNotes("");
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart className="size-5 text-primary" />סל קניות</h2>
        {cart.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground"><Trash2 />ריקון</Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center text-muted-foreground">
            <div className="grid size-16 place-items-center rounded-full bg-muted"><ShoppingCart className="size-7" /></div>
            <p className="font-medium text-foreground">הסל ריק</p>
            <p className="text-sm">בחרו מוצר או סרקו ברקוד כדי להתחיל</p>
          </div>
        ) : (
          <ul className="divide-y">
            {cart.map((l) => {
              const a = lineAmounts({ qtyKg: l.qtyKg, pricePerKg: l.pricePerKg, discount: l.discount });
              const bad = mismatched.has(l.key);
              return (
                <li key={l.key} className={cn("flex gap-3 px-4 py-3", bad && "bg-destructive/5")}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.productName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="ltr font-mono">{l.batchNumber}</span>
                      <span>· {l.kosherBodyName}</span>
                      <span>· תפוגה <span className="num">{formatDate(l.expiryDate)}</span></span>
                    </div>
                    <div className="num mt-1 text-sm">
                      {formatKg(l.qtyKg)} × {formatCurrency(l.pricePerKg)}
                      {l.packages > 0 && <span className="text-muted-foreground"> · {l.packages} אר׳</span>}
                    </div>
                    {bad && <div className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="size-3.5" />לא תואם לדרישת ההכשר</div>}
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <div className="text-end">
                      <div className="num font-bold">{formatCurrency(a.total)}</div>
                      {a.discount > 0 && <div className="num text-xs text-success line-through decoration-muted-foreground">{formatCurrency(a.gross)}</div>}
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => onRemove(l.key)} aria-label="הסרה"><Trash2 className="text-muted-foreground" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      <div className="space-y-3 border-t bg-muted/30 p-4">
        {cart.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="שם לקוח (רשות)" className="h-9 bg-background" />
            <Input inputMode="decimal" dir="ltr" value={saleDiscount} onChange={(e) => setSaleDiscount(e.target.value)} placeholder="הנחה כללית ₪" className="h-9 bg-background text-start" />
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות" rows={1} className="col-span-2 min-h-9 bg-background" />
          </div>
        )}
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">משקל כולל</dt><dd className="num">{formatKg(totalKg)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">סכום ביניים</dt><dd className="num">{formatCurrency(totals.subtotal)}</dd></div>
          {round2(totals.itemsDiscount + totals.saleDiscount) > 0 && (
            <div className="flex justify-between text-[oklch(0.45_0.11_155)]">
              <dt>הנחות</dt><dd className="num">-{formatCurrency(round2(totals.itemsDiscount + totals.saleDiscount))}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t pt-2">
            <dt className="text-base font-semibold">לתשלום</dt>
            <dd className="num text-3xl font-extrabold tracking-tight">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button
          size="lg"
          className="h-14 w-full text-lg shadow-lg shadow-primary/30"
          disabled={cart.length === 0 || pending || blocked}
          onClick={submit}
        >
          {pending ? <Spinner /> : <CheckCircle2 className="size-5" />}
          {blocked ? "יש פריטים שלא תואמים להכשר" : "אישור מכירה"}
        </Button>
      </div>
    </div>
  );
}
