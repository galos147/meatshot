import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { UsersManager } from "./users-manager";

export const metadata: Metadata = { title: "עובדים והרשאות" };

export default async function UsersPage() {
  const me = await requirePermission("users.manage");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("is_active", { ascending: false }).order("full_name");

  return (
    <>
      <PageHeader icon={Users} title="עובדים והרשאות" description="יצירת משתמשים לעובדים וקביעת תפקיד. ההרשאות נאכפות בשרת ובמסד הנתונים." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
          <div key={r} className="rounded-xl border bg-card p-3">
            <div className="text-sm font-semibold">{ROLE_LABELS[r]}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</div>
            <div className="num mt-2 text-xs">{(data ?? []).filter((p) => p.role === r && p.is_active).length} עובדים</div>
          </div>
        ))}
      </div>
      <UsersManager rows={data ?? []} meId={me.id} />
    </>
  );
}
