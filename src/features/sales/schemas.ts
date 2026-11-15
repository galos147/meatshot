import { z } from "zod";
import { money, optionalText, packages, requiredText, uuid, weightKg } from "@/lib/validation";

export const saleItemSchema = z.object({
  batch_id: uuid("אצווה"),
  location_id: uuid("מיקום"),
  qty_kg: weightKg("משקל"),
  packages: packages(),
  discount_amount: money("הנחה").default(0),
});

export const saleSchema = z.object({
  idempotency_key: z.uuid(),
  kosher_body_ids: z.array(z.uuid()).default([]),
  items: z.array(saleItemSchema).min(1, "הסל ריק").max(200, "יותר מדי שורות"),
  sale_discount: money("הנחת מכירה").default(0),
  customer_name: optionalText(120),
  notes: optionalText(500),
});

export type SaleInput = z.input<typeof saleSchema>;

export const returnSchema = z.object({
  sale_id: uuid(),
  reason: requiredText("סיבה", 300),
  items: z
    .array(
      z.object({
        sale_item_id: uuid(),
        qty_kg: weightKg("משקל", { allowZero: true }),
        packages: packages(),
        restock: z.boolean(),
        location_id: z.uuid().nullable().optional(),
      }),
    )
    .transform((items) => items.filter((i) => i.qty_kg > 0 || i.packages > 0))
    .refine((items) => items.length > 0, "לא נבחרו פריטים להחזרה"),
});
