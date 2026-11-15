import { z } from "zod";
import { isoDate, money, optionalIsoDate, optionalText, optionalUuid, requiredText, uuid, weightKg } from "@/lib/validation";

export const categorySchema = z.object({
  name: requiredText("שם", 80),
  description: optionalText(),
  color: optionalText(20),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const kosherLevelSchema = z.object({
  name: requiredText("שם הרמה", 80),
  rank: z.coerce.number({ error: "דירוג חייב להיות מספר" }).int().min(0).max(100).default(0),
  is_active: z.boolean().default(true),
});

export const kosherBodySchema = z.object({
  name: requiredText("שם גוף ההכשר", 120),
  level_id: optionalUuid(),
  contact: optionalText(200),
  notes: optionalText(),
  is_active: z.boolean().default(true),
});

export const certificateSchema = z
  .object({
    kosher_body_id: uuid("גוף הכשר"),
    supplier_id: optionalUuid(),
    certificate_number: requiredText("מספר תעודה", 80),
    valid_from: optionalIsoDate(),
    valid_until: isoDate("תוקף עד"),
    notes: optionalText(),
    is_active: z.boolean().default(true),
  })
  .refine((v) => !v.valid_from || v.valid_from <= v.valid_until, { path: ["valid_until"], message: "התוקף מסתיים לפני שהתחיל" });

export const supplierSchema = z.object({
  name: requiredText("שם", 120),
  kind: z.enum(["supplier", "factory", "both"]).default("supplier"),
  business_number: optionalText(20),
  contact_name: optionalText(100),
  phone: optionalText(30),
  email: z.union([z.email("אימייל לא תקין"), z.literal(""), z.null()]).optional().transform((v) => v || null),
  address: optionalText(200),
  notes: optionalText(),
  is_active: z.boolean().default(true),
});

export const warehouseSchema = z.object({
  name: requiredText("שם", 80),
  code: optionalText(20),
  address: optionalText(200),
  notes: optionalText(),
  is_active: z.boolean().default(true),
});

export const locationTypeSchema = z.object({
  name: requiredText("שם הסוג", 60),
  is_active: z.boolean().default(true),
});

const temp = z
  .union([z.literal(""), z.null(), z.coerce.number({ error: "טמפרטורה חייבת להיות מספר" }).min(-60, "נמוך מדי").max(40, "גבוה מדי")])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : v));

export const locationSchema = z
  .object({
    warehouse_id: uuid("מחסן"),
    location_type_id: optionalUuid(),
    name: requiredText("שם", 80),
    code: requiredText("מספר / קוד", 20),
    zone: optionalText(40),
    shelf: optionalText(40),
    temp_min: temp,
    temp_max: temp,
    notes: optionalText(),
    is_active: z.boolean().default(true),
  })
  .refine((v) => v.temp_min === null || v.temp_max === null || v.temp_min <= v.temp_max, {
    path: ["temp_max"],
    message: "טמפרטורה מקסימלית נמוכה מהמינימלית",
  });

export const productSchema = z.object({
  name: requiredText("שם המוצר", 120),
  sku: requiredText("מק\"ט", 40),
  barcode: optionalText(64),
  category_id: optionalUuid(),
  description: optionalText(),
  sale_price_per_kg: money("מחיר מכירה"),
  cost_price_per_kg: money("מחיר עלות"),
  min_stock_kg: weightKg("סף מלאי", { allowZero: true }),
  is_active: z.boolean().default(true),
});

export type ProductInput = z.output<typeof productSchema>;
