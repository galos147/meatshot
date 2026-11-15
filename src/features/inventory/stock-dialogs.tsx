"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Combobox, type ComboOption } from "@/components/combobox";
import type { ActionResult } from "@/lib/action";
import { formatKg } from "@/lib/format";
import { adjustStock, transferStock } from "./actions";

export type StockRow = {
  batch_id: string;
  location_id: string;
  batch_number: string;
  product_name: string;
  location_name: string;
  qty_kg: number;
  packages: number;
};

function Summary({ row }: { row: StockRow }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-3 text-sm">
      <div><div className="text-xs text-muted-foreground">מוצר</div><div className="font-medium">{row.product_name}</div></div>
      <div><div className="text-xs text-muted-foreground">אצווה · מיקום</div><div className="ltr text-end font-mono text-xs">{row.batch_number}</div><div className="text-xs">{row.location_name}</div></div>
      <div><div className="text-xs text-muted-foreground">זמין</div><div className="num font-semibold">{formatKg(row.qty_kg)}</div><div className="text-xs text-muted-foreground">{row.packages} אריזות</div></div>
    </div>
  );
}

function useSubmit(onDone: () => void) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const submit = (fn: () => Promise<ActionResult<unknown>>, success: string) =>
    start(async () => {
      setError(null);
      setFieldErrors({});
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        onDone();
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  const errs = (k: string) => fieldErrors[k]?.map((message) => ({ message }));
  return { pending, error, fieldErrors, errs, submit };
}

/** Uncontrolled (renders its own trigger) or controlled via open / onOpenChange. */
function useOpen(openProp?: boolean, onOpenChange?: (o: boolean) => void) {
  const [state, setState] = useState(false);
  const controlled = openProp !== undefined;
  return [controlled ? openProp : state, (o: boolean) => (controlled ? onOpenChange?.(o) : setState(o)), controlled] as const;
}

export function TransferDialog({
  row,
  locations,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  row: StockRow;
  locations: ComboOption[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen, controlled] = useOpen(openProp, onOpenChange);
  return (
    <>
      {!controlled && (
        <span onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
          {trigger ?? <Button variant="ghost" size="sm"><ArrowLeftRight />העברה</Button>}
        </span>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>העברה בין מקררים</DialogTitle>
            <DialogDescription>הכמות תעבור מהמיקום הנוכחי ליעד, באותה אצווה. ההעברה מתועדת ביומן.</DialogDescription>
          </DialogHeader>
          <TransferForm row={row} locations={locations} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function TransferForm({ row, locations, onClose }: { row: StockRow; locations: ComboOption[]; onClose: () => void }) {
  const [to, setTo] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [pk, setPk] = useState("");
  const [notes, setNotes] = useState("");
  const { pending, error, fieldErrors, errs, submit } = useSubmit(onClose);

  return (
    <>
      <Summary row={row} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" data-invalid={!!fieldErrors.to_location_id}>
          <FieldLabel htmlFor="tr-to">מיקום יעד</FieldLabel>
          <Combobox id="tr-to" options={locations.filter((l) => l.value !== row.location_id)} value={to} onChange={setTo} placeholder="בחירת מקרר / מיקום" />
          <FieldError errors={errs("to_location_id")} />
        </Field>
        <Field data-invalid={!!fieldErrors.qty_kg}>
          <FieldLabel htmlFor="tr-qty">משקל להעברה (ק&quot;ג)</FieldLabel>
          <div className="flex gap-2">
            <Input id="tr-qty" type="number" inputMode="decimal" step="0.001" dir="ltr" className="h-10 text-start" value={qty} onChange={(e) => setQty(e.target.value)} />
            <Button type="button" variant="outline" className="h-10" onClick={() => { setQty(String(row.qty_kg)); setPk(String(row.packages)); }}>הכול</Button>
          </div>
          <FieldError errors={errs("qty_kg")} />
        </Field>
        <Field>
          <FieldLabel>אריזות</FieldLabel>
          <Input type="number" inputMode="numeric" step="1" dir="ltr" className="h-10 text-start" value={pk} onChange={(e) => setPk(e.target.value)} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="tr-notes">הערות</FieldLabel>
          <Textarea id="tr-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" size="lg" onClick={onClose} disabled={pending}>ביטול</Button>
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            submit(
              () => transferStock({ batch_id: row.batch_id, from_location_id: row.location_id, to_location_id: to ?? "", qty_kg: qty || 0, packages: pk || 0, notes }),
              "ההעברה בוצעה",
            )
          }
        >
          {pending && <Spinner />}ביצוע העברה
        </Button>
      </DialogFooter>
    </>
  );
}

export function AdjustDialog({ row, trigger }: { row: StockRow; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        {trigger ?? <Button variant="ghost" size="sm"><SlidersHorizontal />התאמה</Button>}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>התאמת מלאי / השמדה</DialogTitle>
            <DialogDescription>לתיקון ספירה או לרישום פחת. כל שינוי נרשם ביומן התנועות עם הסיבה.</DialogDescription>
          </DialogHeader>
          <AdjustForm row={row} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdjustForm({ row, onClose }: { row: StockRow; onClose: () => void }) {
  const [kind, setKind] = useState<"adjustment" | "waste">("waste");
  const [direction, setDirection] = useState<"add" | "remove">("remove");
  const [qty, setQty] = useState("");
  const [pk, setPk] = useState("");
  const [reason, setReason] = useState("");
  const { pending, error, fieldErrors, errs, submit } = useSubmit(onClose);

  return (
    <>
      <Summary row={row} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel>סוג פעולה</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={kind}
            onValueChange={(v) => {
              if (!v) return;
              setKind(v as typeof kind);
              if (v === "waste") setDirection("remove");
            }}
            className="w-full"
          >
            <ToggleGroupItem value="waste" className="h-10 flex-1">השמדה / פחת</ToggleGroupItem>
            <ToggleGroupItem value="adjustment" className="h-10 flex-1">תיקון ספירה</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        {kind === "adjustment" && (
          <Field className="sm:col-span-2">
            <FieldLabel>כיוון</FieldLabel>
            <ToggleGroup type="single" variant="outline" value={direction} onValueChange={(v) => v && setDirection(v as typeof direction)} className="w-full">
              <ToggleGroupItem value="remove" className="h-10 flex-1"><Minus />הפחתה</ToggleGroupItem>
              <ToggleGroupItem value="add" className="h-10 flex-1"><Plus />הוספה</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        )}
        <Field data-invalid={!!fieldErrors.qty_kg}>
          <FieldLabel>משקל (ק&quot;ג)</FieldLabel>
          <Input type="number" inputMode="decimal" step="0.001" dir="ltr" className="h-10 text-start" value={qty} onChange={(e) => setQty(e.target.value)} />
          <FieldError errors={errs("qty_kg")} />
        </Field>
        <Field>
          <FieldLabel>אריזות</FieldLabel>
          <Input type="number" inputMode="numeric" step="1" dir="ltr" className="h-10 text-start" value={pk} onChange={(e) => setPk(e.target.value)} />
        </Field>
        <Field className="sm:col-span-2" data-invalid={!!fieldErrors.reason}>
          <FieldLabel htmlFor="adj-reason">סיבה (חובה)</FieldLabel>
          <Textarea id="adj-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="למשל: נמצא פגום, ספירת מלאי חודשית" />
          <FieldError errors={errs("reason")} />
        </Field>
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" size="lg" onClick={onClose} disabled={pending}>ביטול</Button>
        <Button
          size="lg"
          variant={direction === "remove" ? "destructive" : "default"}
          disabled={pending}
          onClick={() =>
            submit(
              () => adjustStock({ batch_id: row.batch_id, location_id: row.location_id, kind, direction, qty_kg: qty || 0, packages: pk || 0, reason }),
              "המלאי עודכן",
            )
          }
        >
          {pending && <Spinner />}רישום
        </Button>
      </DialogFooter>
    </>
  );
}
