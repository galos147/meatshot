"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboOption } from "@/components/combobox";
import type { ActionResult } from "@/lib/action";
import { cn } from "@/lib/utils";

type Base = { name: string; label: string; description?: string; wide?: boolean; placeholder?: string };
export type FieldDef =
  | (Base & { type: "text" | "email" | "tel" | "textarea"; ltr?: boolean })
  | (Base & { type: "number"; step?: string; suffix?: string })
  | (Base & { type: "date" })
  | (Base & { type: "color" })
  | (Base & { type: "switch" })
  | (Base & { type: "select"; options: { value: string; label: string }[]; allowEmpty?: boolean })
  | (Base & { type: "combobox"; options: ComboOption[]; allowEmpty?: boolean });

const EMPTY = "__none__";

/**
 * A dialog form generated from a field list and a Zod schema (the same schema the
 * server action validates with). Used by every "+ הוסף" / "עריכה" in the catalogue.
 */
export function EntityDialog<S extends z.ZodType<FieldValues, FieldValues>>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  fields,
  defaultValues,
  onSubmit,
  submitLabel = "שמירה",
  successMessage = "נשמר בהצלחה",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: S;
  fields: FieldDef[];
  defaultValues: DefaultValues<z.input<S>>;
  onSubmit: (values: z.output<S>) => Promise<ActionResult<unknown>>;
  submitLabel?: string;
  successMessage?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Mounted only while open, so every opening starts from fresh defaults. */}
        <EntityForm
          schema={schema}
          fields={fields}
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
          successMessage={successMessage}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          onPendingChange={setPending}
        />
      </DialogContent>
    </Dialog>
  );
}


function EntityForm<S extends z.ZodType<FieldValues, FieldValues>>({
  schema,
  fields,
  defaultValues,
  onSubmit,
  submitLabel,
  successMessage,
  onDone,
  onCancel,
  onPendingChange,
}: {
  schema: S;
  fields: FieldDef[];
  defaultValues: DefaultValues<z.input<S>>;
  onSubmit: (values: z.output<S>) => Promise<ActionResult<unknown>>;
  submitLabel: string;
  successMessage: string;
  onDone: () => void;
  onCancel: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<z.input<S>, unknown, z.output<S>>({ resolver: zodResolver(schema as never), defaultValues });

  const submit = form.handleSubmit((values) =>
    start(async () => {
      onPendingChange(true);
      setServerError(null);
      const res = await onSubmit(values);
      onPendingChange(false);
      if (res.ok) {
        toast.success(successMessage);
        onDone();
      } else {
        setServerError(res.error);
        for (const [name, messages] of Object.entries(res.fieldErrors ?? {})) {
          form.setError(name as Path<z.input<S>>, { message: messages[0] });
        }
      }
    }),
  );

  return (
        <form onSubmit={submit} className="grid gap-x-4 gap-y-4 sm:grid-cols-2" noValidate>
          {fields.map((f) => (
            <Controller
              key={f.name}
              control={form.control}
              name={f.name as Path<z.input<S>>}
              render={({ field, fieldState }) => {
                const id = `f-${f.name}`;
                const invalid = fieldState.invalid;
                const value = field.value as unknown;
                return (
                  <Field
                    data-invalid={invalid}
                    orientation={f.type === "switch" ? "horizontal" : "vertical"}
                    className={cn((f.wide || f.type === "textarea") && "sm:col-span-2", f.type === "switch" && "rounded-lg border p-3")}
                  >
                    {f.type !== "switch" && <FieldLabel htmlFor={id}>{f.label}</FieldLabel>}
                    {renderInput(f, id, value, field.onChange, field.onBlur, invalid)}
                    {f.type === "switch" && <FieldLabel htmlFor={id} className="flex-1">{f.label}</FieldLabel>}
                    {f.description && <FieldDescription>{f.description}</FieldDescription>}
                    {invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                );
              }}
            />
          ))}

          {serverError && (
            <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
              {serverError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={pending}>
              ביטול
            </Button>
            <Button type="submit" size="lg" disabled={pending} className="min-w-28">
              {pending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
  );
}

function renderInput(
  f: FieldDef,
  id: string,
  value: unknown,
  onChange: (v: unknown) => void,
  onBlur: () => void,
  invalid: boolean,
) {
  const common = { id, onBlur, "aria-invalid": invalid || undefined, placeholder: f.placeholder };
  switch (f.type) {
    case "textarea":
      return <Textarea {...common} rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return (
        <div className="relative">
          <Input
            {...common}
            type="number"
            inputMode="decimal"
            step={f.step ?? "any"}
            dir="ltr"
            className={cn("h-10 text-start", f.suffix && "pe-12")}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => onChange(e.target.value)}
          />
          {f.suffix && (
            <span className="pointer-events-none absolute top-1/2 end-3 -translate-y-1/2 text-sm text-muted-foreground">{f.suffix}</span>
          )}
        </div>
      );
    case "date":
      return <Input {...common} type="date" className="h-10" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "color":
      return (
        <div className="flex items-center gap-2">
          <Input {...common} type="color" className="h-10 w-14 p-1" value={(value as string) || "#8b1e2b"} onChange={(e) => onChange(e.target.value)} />
          <span className="num text-sm text-muted-foreground">{(value as string) || "—"}</span>
        </div>
      );
    case "switch":
      return <Switch id={id} checked={!!value} onCheckedChange={onChange} />;
    case "select":
      return (
        <Select value={(value as string) || (f.allowEmpty ? EMPTY : "")} onValueChange={(v) => onChange(v === EMPTY ? null : v)}>
          <SelectTrigger id={id} aria-invalid={invalid || undefined} className="h-10! w-full">
            <SelectValue placeholder={f.placeholder ?? "בחירה..."} />
          </SelectTrigger>
          <SelectContent>
            {f.allowEmpty && <SelectItem value={EMPTY}>ללא</SelectItem>}
            {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "combobox":
      return (
        <Combobox id={id} options={f.options} value={value as string} onChange={onChange} allowClear={f.allowEmpty} invalid={invalid} placeholder={f.placeholder} />
      );
    default:
      return (
        <Input
          {...common}
          type={f.type}
          dir={f.ltr ? "ltr" : undefined}
          className={cn("h-10", f.ltr && "text-start")}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
