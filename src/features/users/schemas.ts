import { z } from "zod";
import { requiredText } from "@/lib/validation";

export const ROLES = ["admin", "store_manager", "warehouse_worker", "sales_employee", "viewer"] as const;
export const password = z.string().min(8, "סיסמה של 8 תווים לפחות").max(72, "סיסמה ארוכה מדי");

export const createUserSchema = z.object({
  full_name: requiredText("שם מלא", 100),
  email: z.email("אימייל לא תקין"),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum(ROLES),
  password,
});

export const editUserSchema = z.object({
  full_name: createUserSchema.shape.full_name,
  phone: createUserSchema.shape.phone,
  role: createUserSchema.shape.role,
});

export const passwordSchema = z.object({ password });
