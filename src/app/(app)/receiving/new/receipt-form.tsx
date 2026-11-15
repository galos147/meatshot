"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, PackageCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/combobox";
import { receiveGoods } from "@/features/inventory/actions";
import { receiptSchema } from "@/features/inventory/schemas";
import type { Lookups } from "@/features/lookups";
import { formatCurrency, formatDate, formatKg, todayIso } from "@/lib/format";
import { round2 } from "@/lib/pricing";

type FormIn = z.input<typeof receiptSchema>;
type FormOut = z.output<typeof receiptSchema>;
type Line = FormIn["lines"][number];

const NONE = "__none__";

export function ReceiptForm({ lookups }: { lookups: Lookups }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const emptyLine = (prev?: Line): Line => ({
    product_id: "",
    kosher_body_id: prev?.kosher_body_id ?? lookups.kosherBodies[0]?.value ?? "",
    kosher_certificate_id: prev?.kosher_certificate_id ?? null,
    supplier_lot: "",
    production_date: "",
    expiry_date: "",
    qty_kg: "" as unknown as number,
    packages: "" as unknown as number,
    cost_price_per_kg: "" as unknown as number,
    location_id: prev?.location_id ?? lookups.locations[0]?.value ?? "",
  });

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(receiptSchema),
    defaultValues: { supplier_id: "", delivery_note_number: "", received_date: todayIso(), notes: "", lines: [emptyLine()] },
  });
  const { fields, append, remove, insert } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" });
  const supplierId = useWatch({ control: form.control, name: "supplier_id" });

  const totalKg = (lines ?? []).reduce((s, l) => s + (Number(l.qty_kg) || 0), 0);
  const totalCost = (lines ?? []).reduce((s, l) => s + round2((Number(l.qty_kg) || 0) * (Number(l.cost_price_per_kg) || 0)), 0);

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const res = await receiveGoods(values);
      if (res.ok) {
        toast.success(`הקבלה נשמרה – נוצרו ${values.lines.length} אצוות`);
        router.push(`/receiving/${res.data.receiptId}`);
      } else {
        setServerError(res.error);
        toast.error(res.error);
      }
    }),
  );

  const missingSetup = [
    !lookups.suppliers.length && "ספקים",
    !lookups.products.length && "מוצרים",
    !lookups.kosherBodies.length && "גופי הכשר",
    !lookups.locations.length && "מקררים / מיקומים",
  ].filter(Boolean);

  if (missingSetup.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>חסרים נתוני בסיס</CardTitle>
          <CardDescription>לפני קבלת סחורה יש להגדיר: {missingSetup.join(", ")}.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>פרטי המשלוח</CardTitle>
          <CardDescription>מי שלח, מתי, ומספר תעודת המשלוח</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Controller
            control={form.control}
            name="supplier_id"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="supplier_id">ספק / מפעל</FieldLabel>
                <Combobox id="supplier_id" options={lookups.suppliers} value={field.value} onChange={(v) => field.onChange(v ?? "")} placeholder="בחירת ספק" invalid={fieldState.invalid} />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Field data-invalid={!!form.formState.errors.received_date}>
            <FieldLabel htmlFor="received_date">תאריך קבלה</FieldLabel>
            <Input id="received_date" type="date" className="h-10" max={todayIso()} {...form.register("received_date")} />
            <FieldError errors={[form.formState.errors.received_date]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="dn">מספר תעודת משלוח</FieldLabel>
            <Input id="dn" dir="ltr" className="h-10 text-start" {...form.register("delivery_note_number")} />
          </Field>
          <Field className="md:col-span-3">
            <FieldLabel htmlFor="notes">הערות</FieldLabel>
            <Textarea id="notes" rows={2} {...form.register("notes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">שורות קבלה</h2>
            <p className="text-sm text-muted-foreground">כל שורה תיצור אצווה נפרדת – תאריך תפוגה או הכשר שונים = שורה נפרדת.</p>
          </div>
        </div>

        {fields.map((f, i) => (
          <LineCard
            key={f.id}
            index={i}
            control={form.control}
            lookups={lookups}
            supplierId={supplierId}
            canRemove={fields.length > 1}
            onRemove={() => remove(i)}
            onDuplicate={() => insert(i + 1, { ...lines[i], qty_kg: "" as unknown as number, packages: "" as unknown as number, supplier_lot: "" })}
            setValue={(name, value) => form.setValue(`lines.${i}.${name}` as never, value as never, { shouldValidate: false })}
          />
        ))}

        <Button type="button" variant="outline" size="lg" className="w-full border-dashed" onClick={() => append(emptyLine(lines[lines.length - 1]))}>
          <Plus />הוספת שורה
        </Button>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-sm"><span className="text-muted-foreground">שורות: </span><span className="num font-semibold">{fields.length}</span></div>
          <div className="text-sm"><span className="text-muted-foreground">משקל כולל: </span><span className="num font-semibold">{formatKg(totalKg)}</span></div>
          <div className="text-sm"><span className="text-muted-foreground">עלות כוללת: </span><span className="num font-semibold">{formatCurrency(totalCost)}</span></div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" size="lg" disabled={pending} className="ms-auto min-w-40 shadow-md shadow-primary/25">
            {pending ? <Spinner /> : <PackageCheck />}
            אישור קבלה
          </Button>
        </div>
      </div>
    </form>
  );
}

function LineCard({
  index,
  control,
  lookups,
  supplierId,
  canRemove,
  onRemove,
  onDuplicate,
  setValue,
}: {
  index: number;
  control: Control<FormIn, unknown, FormOut>;
  lookups: Lookups;
  supplierId: string;
  canRemove: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  setValue: (name: keyof Line, value: unknown) => void;
}) {
  const line = useWatch({ control, name: `lines.${index}` });
  const certs = lookups.certificates.filter(
    (c) => c.bodyId === line?.kosher_body_id && (!c.supplierId || !supplierId || c.supplierId === supplierId),
  );
  const amount = round2((Number(line?.qty_kg) || 0) * (Number(line?.cost_price_per_kg) || 0));
  const p = `lines.${index}` as const;

  return (
    <Card className="gap-3 border-s-4 border-s-primary/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-sm text-primary">{index + 1}</span>
          אצווה חדשה
          {amount > 0 && <span className="num text-sm font-normal text-muted-foreground">· {formatCurrency(amount)}</span>}
        </CardTitle>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onDuplicate}><Copy />שכפול</Button>
          {canRemove && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onRemove}><Trash2 />הסרה</Button>}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Controller
          control={control}
          name={`${p}.product_id`}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor={`${p}.product_id`}>מוצר</FieldLabel>
              <Combobox
                id={`${p}.product_id`}
                options={lookups.products}
                value={field.value}
                invalid={fieldState.invalid}
                placeholder='חיפוש לפי שם / מק"ט / ברקוד'
                onChange={(v) => {
                  field.onChange(v ?? "");
                  const prod = lookups.products.find((x) => x.value === v);
                  if (prod && prod.cost != null && !line?.cost_price_per_kg) setValue("cost_price_per_kg", prod.cost);
                }}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name={`${p}.kosher_body_id`}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${p}.kosher_body_id`}>הכשר</FieldLabel>
              <Select value={field.value} onValueChange={(v) => { field.onChange(v); setValue("kosher_certificate_id", null); }}>
                <SelectTrigger id={`${p}.kosher_body_id`} className="h-10! w-full" aria-invalid={fieldState.invalid || undefined}><SelectValue placeholder="בחירת הכשר" /></SelectTrigger>
                <SelectContent>{lookups.kosherBodies.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name={`${p}.kosher_certificate_id`}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`${p}.kosher_certificate_id`}>תעודת הכשר</FieldLabel>
              <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                <SelectTrigger id={`${p}.kosher_certificate_id`} className="h-10! w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>ללא תעודה</SelectItem>
                  {certs.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label} · עד {formatDate(c.validUntil)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <NumberField control={control} name={`${p}.qty_kg`} label='משקל (ק"ג)' step="0.001" />
        <NumberField control={control} name={`${p}.packages`} label="מספר אריזות" step="1" />
        <NumberField control={control} name={`${p}.cost_price_per_kg`} label='עלות לק"ג (₪)' step="0.01" />
        <Controller
          control={control}
          name={`${p}.location_id`}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${p}.location_id`}>מקרר / מיקום</FieldLabel>
              <Combobox id={`${p}.location_id`} options={lookups.locations} value={field.value} onChange={(v) => field.onChange(v ?? "")} invalid={fieldState.invalid} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <DateField control={control} name={`${p}.production_date`} label="תאריך ייצור" />
        <DateField control={control} name={`${p}.expiry_date`} label="תאריך תפוגה" />
        <Controller
          control={control}
          name={`${p}.supplier_lot`}
          render={({ field }) => (
            <Field className="lg:col-span-2">
              <FieldLabel htmlFor={`${p}.supplier_lot`}>לוט ספק (אופציונלי)</FieldLabel>
              <Input id={`${p}.supplier_lot`} dir="ltr" className="h-10 text-start" value={field.value ?? ""} onChange={field.onChange} />
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}

function NumberField({ control, name, label, step }: { control: Control<FormIn, unknown, FormOut>; name: `lines.${number}.${"qty_kg" | "packages" | "cost_price_per_kg"}`; label: string; step: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            id={name}
            type="number"
            inputMode="decimal"
            step={step}
            min="0"
            dir="ltr"
            className="h-10 text-start"
            value={(field.value as number | string | undefined) ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            aria-invalid={fieldState.invalid || undefined}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function DateField({ control, name, label }: { control: Control<FormIn, unknown, FormOut>; name: `lines.${number}.${"production_date" | "expiry_date"}`; label: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input id={name} type="date" className="h-10" value={(field.value as string | null) ?? ""} onChange={field.onChange} aria-invalid={fieldState.invalid || undefined} />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
