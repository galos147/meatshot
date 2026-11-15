"use client";

import { useEffect, useState, useTransition } from "react";
import { Ban, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboOption } from "@/components/combobox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cancelSale, returnSaleItems } from "@/features/sales/actions";
import { formatKg } from "@/lib/format";
import { round3 } from "@/lib/pricing";

export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function CancelSaleButton({ saleId, saleNumber }: { saleId: string; saleNumber: number }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="destructive" size="lg" className="no-print"><Ban />ביטול מכירה</Button>}
      title={`ביטול מכירה #${saleNumber}`}
      description="כל הסחורה שלא הוחזרה תחזור למלאי, למיקום המקורי. הפעולה מתועדת ואינה מוחקת את המכירה."
      requireReason
      reasonLabel="סיבת הביטול (חובה)"
      confirmLabel="ביטול המכירה"
      destructive
      successMessage="המכירה בוטלה והמלאי הוחזר"
      onConfirm={(reason) => cancelSale(saleId, reason)}
    />
  );
}

type Item = {
  id: string;
  product_name: string;
  batch_number: string;
  location_id: string;
  qty_kg: number;
  returned_qty_kg: number;
  packages: number;
  returned_packages: number;
};

export function ReturnItemsButton({ saleId, items, locations }: { saleId: string; items: Item[]; locations: ComboOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<string, { qty: string; restock: boolean; location: string }>>({});
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const returnable = items.filter((i) => i.qty_kg - i.returned_qty_kg > 0);
  if (returnable.length === 0) return null;

  const openDialog = () => {
    setState(Object.fromEntries(returnable.map((i) => [i.id, { qty: "", restock: true, location: i.location_id }])));
    setReason("");
    setError(null);
    setOpen(true);
  };

  const submit = () =>
    start(async () => {
      const res = await returnSaleItems({
        sale_id: saleId,
        reason,
        items: returnable.map((i) => ({
          sale_item_id: i.id,
          qty_kg: state[i.id]?.qty || 0,
          packages: 0,
          restock: state[i.id]?.restock ?? true,
          location_id: state[i.id]?.location ?? i.location_id,
        })),
      });
      if (res.ok) {
        toast.success("ההחזרה נרשמה");
        setOpen(false);
      } else setError(res.error);
    });

  return (
    <>
      <Button variant="outline" size="lg" className="no-print" onClick={openDialog}><Undo2 />החזרה</Button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>החזרת פריטים</DialogTitle>
            <DialogDescription>
              סחורה תקינה חוזרת למלאי (לאצווה המקורית). סחורה שאינה ראויה למכירה – כבו את &quot;החזרה למלאי&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {returnable.map((i) => {
              const max = round3(i.qty_kg - i.returned_qty_kg);
              const s = state[i.id];
              return (
                <div key={i.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_8rem_auto] sm:items-center">
                  <div>
                    <div className="font-medium">{i.product_name}</div>
                    <div className="text-xs text-muted-foreground"><span className="ltr font-mono">{i.batch_number}</span> · ניתן להחזיר עד <span className="num">{formatKg(max)}</span></div>
                  </div>
                  <div className="flex gap-1">
                    <Input
                      inputMode="decimal" dir="ltr" placeholder="0.000" className="h-9 text-start"
                      value={s?.qty ?? ""} onChange={(e) => setState((st) => ({ ...st, [i.id]: { ...st[i.id], qty: e.target.value } }))}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setState((st) => ({ ...st, [i.id]: { ...st[i.id], qty: String(max) } }))}>הכול</Button>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={s?.restock ?? true} onCheckedChange={(v) => setState((st) => ({ ...st, [i.id]: { ...st[i.id], restock: v } }))} />
                    החזרה למלאי
                  </label>
                  {s?.restock && Number(s.qty) > 0 && (
                    <div className="sm:col-span-3">
                      <Combobox options={locations} value={s.location} onChange={(v) => v && setState((st) => ({ ...st, [i.id]: { ...st[i.id], location: v } }))} />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="space-y-1.5">
              <Label htmlFor="ret-reason">סיבת ההחזרה (חובה)</Label>
              <Textarea id="ret-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setOpen(false)} disabled={pending}>ביטול</Button>
            <Button size="lg" onClick={submit} disabled={pending || !reason.trim()}>{pending && <Spinner />}רישום החזרה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
