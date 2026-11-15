import { z } from "zod";

/** Shared Zod building blocks with Hebrew messages. */
export const requiredText = (label: string, max = 200) =>
  z.string({ error: `${label} הוא שדה חובה` }).trim().min(1, `${label} הוא שדה חובה`).max(max, `${label} ארוך מדי`);

export const optionalText = (max = 1000) =>
  z.string().trim().max(max, "הטקסט ארוך מדי").optional().nullable().transform((v) => (v ? v : null));

export const uuid = (label = "שדה") => z.uuid({ error: `יש לבחור ${label}` });
export const optionalUuid = () =>
  z.union([z.uuid(), z.literal(""), z.null()]).optional().transform((v) => (v ? v : null));

export const money = (label: string) =>
  z.coerce.number({ error: `${label} חייב להיות מספר` }).min(0, `${label} לא יכול להיות שלילי`).max(1_000_000, `${label} גבוה מדי`)
    .transform((n) => Math.round(n * 100) / 100);

/** Weight in kg, stored with exactly three decimals. */
export const weightKg = (label = "משקל", { allowZero = false } = {}) =>
  z.coerce.number({ error: `${label} חייב להיות מספר` })
    .refine((n) => (allowZero ? n >= 0 : n > 0), allowZero ? `${label} לא יכול להיות שלילי` : `${label} חייב להיות גדול מאפס`)
    .refine((n) => n <= 100_000, `${label} גבוה מדי`)
    .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, `${label}: עד 3 ספרות אחרי הנקודה`)
    .transform((n) => Math.round(n * 1000) / 1000);

export const packages = () =>
  z.coerce.number({ error: "מספר אריזות חייב להיות מספר" }).int("מספר אריזות חייב להיות שלם").min(0, "לא יכול להיות שלילי").default(0);

export const isoDate = (label: string) =>
  z.string({ error: `${label} הוא שדה חובה` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${label} אינו תאריך תקין`);

export const optionalIsoDate = () =>
  z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).optional().transform((v) => (v ? v : null));
