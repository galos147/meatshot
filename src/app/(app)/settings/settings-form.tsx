"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { saveSettings } from "@/features/settings/actions";

type Values = { store_name: string; expiry_alert_days: string; default_min_stock_kg: number };

export function SettingsForm({ defaults }: { defaults: Values }) {
  const [values, setValues] = useState(defaults);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveSettings(values);
      if (res.ok) {
        setErrors({});
        toast.success("ההגדרות נשמרו");
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  };

  const err = (k: string) => errors[k]?.map((message) => ({ message }));

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader><CardTitle>כללי</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" data-invalid={!!errors.store_name}>
            <FieldLabel htmlFor="store_name">שם החנות</FieldLabel>
            <Input id="store_name" className="h-10" value={values.store_name} onChange={(e) => setValues({ ...values, store_name: e.target.value })} />
            <FieldDescription>מופיע בראש המסך ובקבלות</FieldDescription>
            <FieldError errors={err("store_name")} />
          </Field>
          <Field data-invalid={!!errors.expiry_alert_days}>
            <FieldLabel htmlFor="days">ימי התראה לפני תפוגה</FieldLabel>
            <Input id="days" dir="ltr" className="h-10 text-start" value={values.expiry_alert_days} onChange={(e) => setValues({ ...values, expiry_alert_days: e.target.value })} />
            <FieldDescription>מופרד בפסיקים. ברירת מחדל: 14, 7, 3</FieldDescription>
            <FieldError errors={err("expiry_alert_days")} />
          </Field>
          <Field data-invalid={!!errors.default_min_stock_kg}>
            <FieldLabel htmlFor="min">סף מלאי ברירת מחדל (ק״ג)</FieldLabel>
            <Input id="min" type="number" step="0.001" dir="ltr" className="h-10 text-start" value={values.default_min_stock_kg} onChange={(e) => setValues({ ...values, default_min_stock_kg: e.target.value as unknown as number })} />
            <FieldDescription>הצעה למוצרים חדשים</FieldDescription>
            <FieldError errors={err("default_min_stock_kg")} />
          </Field>
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button type="submit" size="lg" disabled={pending}>{pending ? <Spinner /> : <Save />}שמירה</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
