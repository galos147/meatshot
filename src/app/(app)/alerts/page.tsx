import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AlertsBoard, RefreshAlertsButton } from "./alerts-board";

export const metadata: Metadata = { title: "התראות" };

export default async function AlertsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("alerts")
    .select("*, batches(batch_number), products(name), profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(1000);

  return (
    <>
      <PageHeader
        icon={Bell}
        title="התראות"
        description="נוצרות אוטומטית בכל שעה במסד הנתונים – גם כשאיש לא פתח את המערכת: תפוגה (14/7/3 ימים), פג תוקף, מלאי נמוך ותעודות הכשר."
        actions={can(user.role, "alerts.ack") && <RefreshAlertsButton />}
      />
      <AlertsBoard
        canAck={can(user.role, "alerts.ack")}
        rows={(data ?? []).map((a) => ({
          id: a.id,
          alert_type: a.alert_type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          status: a.status,
          created_at: a.created_at,
          batch_id: a.batch_id,
          batch_number: a.batches?.batch_number ?? null,
          product_id: a.product_id,
          certificate_id: a.certificate_id,
          acknowledged_by: a.profiles?.full_name ?? null,
          acknowledged_at: a.acknowledged_at,
        }))}
      />
    </>
  );
}
