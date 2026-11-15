import { z } from "zod";
import { requiredText, weightKg } from "@/lib/validation";

export const settingsSchema = z.object({
  store_name: requiredText("שם החנות", 80),
  /** "14, 7, 3" → [14, 7, 3] */
  expiry_alert_days: z
    .union([z.string(), z.array(z.number())])
    .transform((v) => (Array.isArray(v) ? v : v.split(/[,\s]+/).filter(Boolean).map(Number)))
    .pipe(
      z
        .array(z.number().int("ימים שלמים בלבד").min(1, "לפחות יום אחד").max(365, "עד 365 ימים"))
        .min(1, "יש להזין לפחות ערך אחד")
        .max(10, "עד 10 ערכים")
        .transform((a) => [...new Set(a)].sort((x, y) => y - x)),
    ),
  default_min_stock_kg: weightKg("סף ברירת מחדל", { allowZero: true }),
});
