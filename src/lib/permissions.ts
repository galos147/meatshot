import type { Database } from "@/types/database";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "מנהל מערכת",
  store_manager: "מנהל חנות",
  warehouse_worker: "עובד מחסן",
  sales_employee: "איש מכירות",
  viewer: "צפייה בלבד",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "גישה מלאה, כולל עובדים והגדרות",
  store_manager: "ניהול קטלוג, מלאי, מכירות, ביטולים ודוחות",
  warehouse_worker: "קבלת סחורה, העברות וספירות מלאי",
  sales_employee: "ביצוע מכירות וצפייה במלאי",
  viewer: "צפייה בנתונים ובדוחות בלבד",
};

// Mirrors the RLS policies and RPC checks in supabase/migrations. The database is the
// source of truth; this map only decides what the UI offers.
const MATRIX = {
  "catalog.manage": ["admin", "store_manager"],
  "stock.receive": ["admin", "store_manager", "warehouse_worker"],
  "stock.move": ["admin", "store_manager", "warehouse_worker"],
  "batch.edit": ["admin", "store_manager", "warehouse_worker"],
  "sales.create": ["admin", "store_manager", "sales_employee"],
  "sales.cancel": ["admin", "store_manager"],
  "ledger.reverse": ["admin", "store_manager"],
  "alerts.ack": ["admin", "store_manager", "warehouse_worker", "sales_employee"],
  "reports.financial": ["admin", "store_manager"],
  "audit.view": ["admin", "store_manager"],
  "users.manage": ["admin"],
  "settings.manage": ["admin"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof MATRIX;

export function can(role: AppRole | null | undefined, permission: Permission): boolean {
  return !!role && (MATRIX[permission] as readonly AppRole[]).includes(role);
}
