import type { Metadata } from "next";
import { Clock, DatabaseBackup, Settings, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "הגדרות" };

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const supabase = await createClient();
  const [{ data: settings }, { data: audit }] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).single(),
    supabase.from("audit_log").select("id, table_name, action, created_at, user_id").order("id", { ascending: false }).limit(15),
  ]);
  const userIds = [...new Set((audit ?? []).map((a) => a.user_id).filter((u): u is string => !!u))];
  const { data: people } = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <>
      <PageHeader icon={Settings} title="הגדרות מערכת" description="הגדרות כלליות של החנות וההתראות" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SettingsForm
            defaults={{
              store_name: settings?.store_name ?? "",
              expiry_alert_days: (settings?.expiry_alert_days ?? [14, 7, 3]).join(", "),
              default_min_stock_kg: Number(settings?.default_min_stock_kg ?? 0),
            }}
          />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" />התראות אוטומטיות</CardTitle>
              <CardDescription>pg_cron מריץ בדיקה בכל שעה (בדקה 5) ישירות במסד הנתונים – לא תלוי בפתיחת האפליקציה.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><DatabaseBackup className="size-4 text-primary" />גיבויים</CardTitle>
              <CardDescription>גיבוי לילי של כל מסד הנתונים מתבצע ב-GitHub Actions (ראו README). מומלץ לבדוק שחזור פעם ברבעון.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" />יומן פעולות אחרונות</CardTitle>
              <CardDescription>שינויים בנתוני ניהול (מוצרים, מחירים, עובדים...)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(audit ?? []).map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>
                      <span className="font-medium">{(a.user_id && nameById.get(a.user_id)) || "מערכת"}</span>{" "}
                      <span className="text-muted-foreground">{ACTION[a.action] ?? a.action} · {TABLE[a.table_name] ?? a.table_name}</span>
                    </span>
                    <span className="num shrink-0 text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

const ACTION: Record<string, string> = { insert: "יצר", update: "עדכן", delete: "מחק" };
const TABLE: Record<string, string> = {
  products: "מוצר", categories: "קטגוריה", suppliers: "ספק", kosher_bodies: "גוף הכשר", kosher_certificates: "תעודת הכשר",
  kosher_levels: "רמת כשרות", warehouses: "מחסן", storage_locations: "מיקום", location_types: "סוג מיקום",
  profiles: "עובד", app_settings: "הגדרות", batches: "אצווה", batch_documents: "מסמך אצווה",
};
