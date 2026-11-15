"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Minus, Plus, ShieldCheck, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ExpiryBadge, Pill } from "@/components/status";
import { allocateFefo, stockKey } from "@/features/sales/allocate";
import { BLOCK_REASON_LABELS } from "@/features/inventory/labels";
import { createClient } from "@/lib/supabase/client";
import { toHebrewError } from "@/lib/errors";
import { formatCurrency, formatKg } from "@/lib/format";
import { lineAmounts, percentToAmount, round2, round3 } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { CartLine, PosProduct } from "./pos-types";

type Row = {
  batch_id: string;
  location_id: string;
  batch_number: string;
  location_name: string;
  warehouse_name: string;
  kosher_body_id: string;
  kosher_body_name: string;
  expiry_date: string;
  days_to_expiry: number;
  qty_kg: number;
  packages: number;
  is_sellable: boolean;
  block_reason: string | null;
};

const QUICK = [0.25, 0.5, 1, 2];

export function AddItemDialog({
  product,
  kosherIds,
  reserved,
  onClose,
  onAdd,
}: {
  product: PosProduct | null;
  kosherIds: string[];
  reserved: Map<string, number>;
  onClose: () => void;
  onAdd: (lines: Omit<CartLine, "key">[]) => void;
}) {
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-3xl">
        {/* Keyed so each product / kosher requirement starts with fresh state. */}
        {product && <AddItemBody key={`${product.id}|${kosherIds.join(",")}`} product={product} kosherIds={kosherIds} reserved={reserved} onAdd={onAdd} />}
      </DialogContent>
    </Dialog>
  );
}

function AddItemBody({
  product,
  kosherIds,
  reserved,
  onAdd,
}: {
  product: PosProduct;
  kosherIds: string[];
  reserved: Map<string, number>;
  onAdd: (lines: Omit<CartLine, "key">[]) => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [pk, setPk] = useState("");
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("percent");
  const [discount, setDiscount] = useState("");
  const [autoSplit, setAutoSplit] = useState(true);

  useEffect(() => {
    createClient()
      .rpc("available_stock", { p_product_id: product.id, p_kosher_body_ids: kosherIds })
      .then(({ data, error }) => {
        if (error) return setError(toHebrewError(error));
        const list = (data ?? []).map((r) => ({ ...r, qty_kg: Number(r.qty_kg), days_to_expiry: Number(r.days_to_expiry) })) as Row[];
        setRows(list);
        // FEFO: preselect the first sellable row that still has free stock.
        const first = list.find((r) => r.is_sellable && r.qty_kg - (reserved.get(stockKey(r)) ?? 0) > 0);
        setSelected(first ? stockKey(first) : null);
      });
    // Runs once per mount (the body is keyed by product + kosher requirement).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const free = (r: Row) => round3(r.qty_kg - (reserved.get(stockKey(r)) ?? 0));
  const totalFree = (rows ?? []).filter((r) => r.is_sellable).reduce((s, r) => s + Math.max(0, free(r)), 0);
  const chosen = rows?.find((r) => stockKey(r) === selected) ?? null;
  const qtyNum = Number(qty) || 0;
  const pkNum = Math.max(0, Math.floor(Number(pk) || 0));

  const plan = useMemo(() => {
    if (!rows || !chosen || qtyNum <= 0) return null;
    if (!autoSplit) {
      return qtyNum <= free(chosen)
        ? { allocations: [{ row: chosen, qty: round3(qtyNum) }], shortfall: 0 }
        : { allocations: [{ row: chosen, qty: free(chosen) }], shortfall: round3(qtyNum - free(chosen)) };
    }
    return allocateFefo(rows, qtyNum, reserved, stockKey(chosen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selected, qtyNum, autoSplit, reserved]);

  const gross = lineAmounts({ qtyKg: qtyNum, pricePerKg: product.price, discount: 0 }).gross;
  const discountAmount = discountMode === "percent" ? percentToAmount(gross, Number(discount) || 0) : Math.min(round2(Number(discount) || 0), gross);
  const decimalsOk = /^\d*(\.\d{0,3})?$/.test(qty);
  const valid = !!plan && plan.shortfall === 0 && qtyNum > 0 && decimalsOk && pkNum <= (chosen?.packages ?? 0);

  const add = () => {
    if (!plan || !valid) return;
    // Spread the discount and packages over the split lines proportionally.
    let discountLeft = discountAmount;
    const lines = plan.allocations.map((a, i) => {
      const isLast = i === plan.allocations.length - 1;
      const lineGross = lineAmounts({ qtyKg: a.qty, pricePerKg: product.price, discount: 0 }).gross;
      const d = isLast ? discountLeft : round2((discountAmount * a.qty) / qtyNum);
      discountLeft = round2(discountLeft - d);
      const r = a.row as Row;
      return {
        productId: product.id,
        productName: product.name,
        batchId: r.batch_id,
        batchNumber: r.batch_number,
        locationId: r.location_id,
        locationName: r.location_name,
        expiryDate: r.expiry_date,
        kosherBodyId: r.kosher_body_id,
        kosherBodyName: r.kosher_body_name,
        qtyKg: a.qty,
        packages: i === 0 ? Math.min(pkNum, r.packages) : 0,
        pricePerKg: product.price,
        discount: Math.min(d, lineGross),
      };
    });
    onAdd(lines);
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription>
            <span className="num font-semibold text-foreground">{formatCurrency(product.price)}</span> לק״ג ·
            זמין למכירה: <span className="num">{formatKg(totalFree)}</span>
            {kosherIds.length > 0 && <> · <ShieldCheck className="inline size-3.5" /> מסונן לפי דרישת הכשר</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>בחירת אצווה <span className="font-normal text-muted-foreground">(מסודר לפי FEFO – הקרובה לתפוגה ראשונה)</span></Label>
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {!rows && !error && <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>}
          {rows && rows.length === 0 && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">אין מלאי למוצר זה</p>
          )}
          <div className="grid max-h-72 gap-2 overflow-y-auto pe-1">
            {rows?.map((r, i) => {
              const k = stockKey(r);
              const f = free(r);
              const disabled = !r.is_sellable || f <= 0;
              const isFirst = i === rows.findIndex((x) => x.is_sellable && free(x) > 0);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelected(k)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card p-3 text-start transition-all",
                    selected === k ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/40",
                    disabled && "cursor-not-allowed opacity-50 hover:border-border",
                  )}
                >
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", selected === k && "border-primary bg-primary text-primary-foreground")}>
                    {selected === k && <Check className="size-4" />}
                  </span>
                  <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 sm:items-center">
                    <div>
                      <div className="ltr text-end font-mono text-sm font-semibold sm:text-start">{r.batch_number}</div>
                      {isFirst && <span className="text-[0.7rem] font-semibold text-primary">מומלץ (FEFO)</span>}
                    </div>
                    <ExpiryBadge date={r.expiry_date} days={r.days_to_expiry} />
                    <div className="text-sm">
                      <div>{r.location_name}</div>
                      <Pill tone={r.block_reason === "kosher_mismatch" ? "danger" : "primary"}>{r.kosher_body_name}</Pill>
                    </div>
                    <div className="text-sm">
                      <div className="num font-semibold">{formatKg(f)}</div>
                      <div className="text-xs text-muted-foreground">{r.packages} אריזות</div>
                      {!r.is_sellable && r.block_reason && (
                        <Pill tone="danger"><AlertTriangle />{BLOCK_REASON_LABELS[r.block_reason] ?? r.block_reason}</Pill>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="pos-qty">משקל (ק״ג)</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon-lg" className="size-12" onClick={() => setQty(String(Math.max(0, round3(qtyNum - 0.1))))} aria-label="הפחתה"><Minus /></Button>
              <Input
                id="pos-qty"
                autoFocus
                inputMode="decimal"
                dir="ltr"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(",", "."))}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="0.000"
                className="h-12 text-center text-2xl font-semibold tabular-nums"
              />
              <Button type="button" variant="outline" size="icon-lg" className="size-12" onClick={() => setQty(String(round3(qtyNum + 0.1)))} aria-label="הוספה"><Plus /></Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <Button key={q} type="button" variant="secondary" size="sm" onClick={() => setQty(String(q))} className="num">{q} ק״ג</Button>
              ))}
              {chosen && <Button type="button" variant="secondary" size="sm" onClick={() => { setQty(String(free(chosen))); setPk(String(chosen.packages)); }}>כל האצווה</Button>}
            </div>
            {!decimalsOk && <p className="text-sm text-destructive">עד 3 ספרות אחרי הנקודה</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-pk">אריזות (אם צריך)</Label>
            <Input id="pos-pk" inputMode="numeric" dir="ltr" value={pk} onChange={(e) => setPk(e.target.value.replace(/\D/g, ""))} placeholder="0" className="h-12 text-center text-lg tabular-nums" />
            {chosen && pkNum > chosen.packages && <p className="text-sm text-destructive">יש רק {chosen.packages} אריזות באצווה</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr] sm:items-end">
          <div className="space-y-2">
            <Label>הנחה</Label>
            <div className="flex gap-2">
              <ToggleGroup type="single" variant="outline" value={discountMode} onValueChange={(v) => v && setDiscountMode(v as typeof discountMode)}>
                <ToggleGroupItem value="percent" className="h-10 px-3">%</ToggleGroupItem>
                <ToggleGroupItem value="amount" className="h-10 px-3">₪</ToggleGroupItem>
              </ToggleGroup>
              <Input inputMode="decimal" dir="ltr" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-10 text-start" />
            </div>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm">
            <Switch checked={autoSplit} onCheckedChange={setAutoSplit} />
            פיצול אוטומטי לאצוות הבאות
          </label>
        </div>

        {plan && plan.allocations.length > 1 && (
          <div className="rounded-xl border border-info/30 bg-info/5 p-3 text-sm">
            <div className="mb-1 font-medium">הכמות תחולק לפי FEFO:</div>
            <ul className="space-y-0.5">
              {plan.allocations.map((a) => (
                <li key={stockKey(a.row)} className="flex justify-between">
                  <span className="ltr font-mono">{(a.row as Row).batch_number}</span>
                  <span className="num">{formatKg(a.qty)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {plan && plan.shortfall > 0 && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            אין מספיק מלאי: חסרים <span className="num">{formatKg(plan.shortfall)}</span>
            {!autoSplit && " – הפעילו פיצול אוטומטי או בחרו כמות קטנה יותר"}
          </p>
        )}

        <DialogFooter className="items-center gap-3 border-t pt-4 sm:justify-between">
          <div className="text-start">
            <div className="text-xs text-muted-foreground">סה״כ לשורה</div>
            <div className="num text-2xl font-bold">{formatCurrency(round2(gross - discountAmount))}</div>
            {discountAmount > 0 && <div className="num text-xs text-muted-foreground line-through">{formatCurrency(gross)}</div>}
          </div>
          <Button size="lg" className="h-12 min-w-44 text-base shadow-md shadow-primary/25" disabled={!valid} onClick={add}>
            <ShoppingCart />הוספה לסל
          </Button>
        </DialogFooter>
    </>
  );
}
