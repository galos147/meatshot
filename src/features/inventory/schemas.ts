import { z } from "zod";
import { isoDate, money, optionalIsoDate, optionalText, optionalUuid, packages, requiredText, uuid, weightKg } from "@/lib/validation";

export const receiptLineSchema = z
  .object({
    product_id: uuid("מוצר"),
    kosher_body_id: uuid("גוף הכשר"),
    kosher_certificate_id: optionalUuid(),
    supplier_lot: optionalText(60),
    production_date: optionalIsoDate(),
    expiry_date: isoDate("תאריך תפוגה"),
    qty_kg: weightKg("משקל"),
    packages: packages(),
    cost_price_per_kg: money("מחיר עלות"),
    location_id: uuid("מיקום"),
  })
  .refine((l) => !l.production_date || l.production_date <= l.expiry_date, {
    path: ["expiry_date"],
    message: "תאריך התפוגה לפני תאריך הייצור",
  });

export const receiptSchema = z
  .object({
    supplier_id: uuid("ספק"),
    delivery_note_number: optionalText(60),
    received_date: isoDate("תאריך קבלה"),
    notes: optionalText(),
    lines: z.array(receiptLineSchema).min(1, "יש להוסיף לפחות שורה אחת"),
  })
  .superRefine((r, ctx) => {
    r.lines.forEach((l, i) => {
      if (l.expiry_date < r.received_date) {
        ctx.addIssue({ code: "custom", path: ["lines", i, "expiry_date"], message: "התפוגה לפני תאריך הקבלה" });
      }
    });
  });

export type ReceiptInput = z.input<typeof receiptSchema>;

export const transferSchema = z
  .object({
    batch_id: uuid("אצווה"),
    from_location_id: uuid("מיקום מקור"),
    to_location_id: uuid("מיקום יעד"),
    qty_kg: weightKg("משקל", { allowZero: true }),
    packages: packages(),
    notes: optionalText(),
  })
  .refine((t) => t.from_location_id !== t.to_location_id, { path: ["to_location_id"], message: "היעד זהה למקור" })
  .refine((t) => t.qty_kg > 0 || t.packages > 0, { path: ["qty_kg"], message: "יש להזין כמות להעברה" });

export const adjustmentSchema = z
  .object({
    batch_id: uuid("אצווה"),
    location_id: uuid("מיקום"),
    kind: z.enum(["adjustment", "waste"]),
    direction: z.enum(["add", "remove"]),
    qty_kg: weightKg("משקל", { allowZero: true }),
    packages: packages(),
    reason: requiredText("סיבה", 300),
  })
  .refine((a) => a.qty_kg > 0 || a.packages > 0, { path: ["qty_kg"], message: "יש להזין כמות" })
  .refine((a) => a.kind !== "waste" || a.direction === "remove", { path: ["direction"], message: "השמדה מפחיתה מלאי" });

export const batchEditSchema = z.object({
  kosher_certificate_id: optionalUuid(),
  supplier_lot: optionalText(60),
  production_date: optionalIsoDate(),
  notes: optionalText(),
});
