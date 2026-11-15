import {
  ArrowLeftRight,
  Bell,
  Boxes,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Layers,
  type LucideIcon,
  Package,
  PackagePlus,
  Refrigerator,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Warehouse,
  Receipt,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  badgeKey?: "alerts";
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "ראשי",
    items: [
      { title: "לוח בקרה", href: "/dashboard", icon: LayoutDashboard },
      { title: "קופה – מכירה חדשה", href: "/sales/new", icon: ShoppingCart, permission: "sales.create" },
      { title: "התראות", href: "/alerts", icon: Bell, badgeKey: "alerts" },
    ],
  },
  {
    label: "מלאי",
    items: [
      { title: "מלאי", href: "/inventory", icon: Boxes },
      { title: "אצוות", href: "/batches", icon: Layers },
      { title: "קבלת סחורה", href: "/receiving", icon: PackagePlus },
      { title: "העברות בין מקררים", href: "/transfers", icon: ArrowLeftRight },
      { title: "יומן תנועות", href: "/transactions", icon: ClipboardList },
    ],
  },
  {
    label: "מכירות",
    items: [{ title: "היסטוריית מכירות", href: "/sales", icon: Receipt }],
  },
  {
    label: "קטלוג",
    items: [
      { title: "מוצרים", href: "/products", icon: Package },
      { title: "קטגוריות", href: "/categories", icon: Tags },
      { title: "ספקים ומפעלים", href: "/suppliers", icon: Truck },
      { title: "הכשרים", href: "/kosher", icon: ShieldCheck },
    ],
  },
  {
    label: "אחסון",
    items: [
      { title: "מחסנים", href: "/warehouses", icon: Warehouse },
      { title: "מקררים ומיקומים", href: "/locations", icon: Refrigerator },
    ],
  },
  {
    label: "ניהול",
    items: [
      { title: "דוחות", href: "/reports", icon: FileBarChart },
      { title: "עובדים והרשאות", href: "/users", icon: Users, permission: "users.manage" },
      { title: "הגדרות", href: "/settings", icon: Settings, permission: "settings.manage" },
    ],
  },
];

/** Longest matching nav href wins, so /sales/new highlights the POS item, not /sales. */
export function activeHref(pathname: string): string | null {
  const all = NAV.flatMap((g) => g.items.map((i) => i.href));
  return all.filter((h) => pathname === h || pathname.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0] ?? null;
}

export function titleFor(pathname: string): string | null {
  const href = activeHref(pathname);
  return NAV.flatMap((g) => g.items).find((i) => i.href === href)?.title ?? null;
}
