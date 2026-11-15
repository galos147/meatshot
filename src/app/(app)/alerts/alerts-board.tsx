"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertOctagon, BellOff, CalendarClock, Check, CheckCheck, Info, PackageMinus, RefreshCw, ShieldAlert, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pill } from "@/components/status";
import { acknowledgeAlerts, refreshAlerts } from "@/features/alerts/actions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type AlertType = Database["public"]["Enums"]["alert_type"];
type Severity = Database["public"]["Enums"]["alert_severity"];
type Status = Database["public"]["Enums"]["alert_status"];

type Row = {
  id: string;
  alert_type: AlertType;
  severity: Severity;
  title: string;
  message: string;
  status: Status;
  created_at: string;
  batch_id: string | null;
  batch_number: string | null;
  product_id: string | null;
  certificate_id: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
};

const TYPE_META: Record<AlertType, { label: string; icon: typeof Info }> = {
  expiry_soon: { label: "תפוגה מתקרבת", icon: CalendarClock },
  expired: { label: "פג תוקף", icon: AlertOctagon },
  low_stock: { label: "מלאי נמוך", icon: PackageMinus },
  kosher_cert_expiring: { label: "תעודת הכשר עומדת לפוג", icon: ShieldAlert },
  kosher_cert_invalid: { label: "תעודת הכשר לא בתוקף", icon: ShieldAlert },
};

const SEVERITY: Record<Severity, { tone: "danger" | "warning" | "info"; label: string; bar: string; icon: string }> = {
  critical: { tone: "danger", label: "דחוף", bar: "bg-destructive", icon: "bg-destructive/10 text-destructive" },
  warning: { tone: "warning", label: "אזהרה", bar: "bg-warning", icon: "bg-warning/20 text-[oklch(0.5_0.12_65)] dark:text-warning" },
  info: { tone: "info", label: "מידע", bar: "bg-info", icon: "bg-info/10 text-info" },
};

export function RefreshAlertsButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="lg"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await refreshAlerts();
          if (res.ok) toast.success(res.data.created ? `נוצרו ${res.data.created} התראות חדשות` : "אין התראות חדשות");
          else toast.error(res.error);
        })
      }
    >
      {pending ? <Spinner /> : <RefreshCw />}בדיקה עכשיו
    </Button>
  );
}

export function AlertsBoard({ rows, canAck }: { rows: Row[]; canAck: boolean }) {
  const [tab, setTab] = useState<Status>("open");
  const [type, setType] = useState<AlertType | "all">("all");
  const [pending, start] = useTransition();

  const counts = useMemo(() => ({
    open: rows.filter((r) => r.status === "open").length,
    acknowledged: rows.filter((r) => r.status === "acknowledged").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
  }), [rows]);

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  const visible = rows
    .filter((r) => r.status === tab && (type === "all" || r.alert_type === type))
    .sort((a, b) => order[a.severity] - order[b.severity] || b.created_at.localeCompare(a.created_at));

  const ack = (ids: string[]) =>
    start(async () => {
      const res = await acknowledgeAlerts(ids);
      if (res.ok) toast.success(ids.length > 1 ? `${ids.length} התראות סומנו כטופלו` : "סומן כטופל");
      else toast.error(res.error);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList>
            <TabsTrigger value="open">פתוחות ({counts.open})</TabsTrigger>
            <TabsTrigger value="acknowledged">בטיפול ({counts.acknowledged})</TabsTrigger>
            <TabsTrigger value="resolved">נסגרו ({counts.resolved})</TabsTrigger>
          </TabsList>
        </Tabs>
        {canAck && tab === "open" && visible.length > 1 && (
          <Button variant="outline" onClick={() => ack(visible.map((r) => r.id))} disabled={pending}>
            <CheckCheck />סימון הכול כטופל
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...Object.keys(TYPE_META)] as (AlertType | "all")[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "h-8 rounded-full border px-3 text-sm transition-colors",
              type === t ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
            )}
          >
            {t === "all" ? "כל הסוגים" : TYPE_META[t].label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card py-16 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-success/15 text-success"><BellOff className="size-6" /></div>
          <p className="font-medium">אין התראות {tab === "open" ? "פתוחות" : ""}</p>
          <p className="text-sm text-muted-foreground">הכול תחת שליטה 👌</p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((a) => {
            const meta = TYPE_META[a.alert_type];
            const sev = SEVERITY[a.severity];
            const Icon = meta.icon;
            const href = a.batch_id ? `/batches/${a.batch_id}` : a.product_id ? `/batches?product=${a.product_id}` : a.certificate_id ? "/kosher" : null;
            return (
              <li key={a.id} className="relative flex gap-3 overflow-hidden rounded-2xl border bg-card p-4 ps-5 shadow-xs">
                <span className={cn("absolute inset-y-0 start-0 w-1.5", sev.bar)} />
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", sev.icon)}><Icon className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{a.title}</span>
                    <Pill tone={sev.tone}>{a.severity === "critical" ? <TriangleAlert /> : null}{sev.label}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="num">{formatDateTime(a.created_at)}</span>
                    {a.acknowledged_by && <span>טופל ע״י {a.acknowledged_by} · <span className="num">{formatDateTime(a.acknowledged_at)}</span></span>}
                    {href && <Link href={href} className="font-medium text-primary hover:underline">לפרטים ←</Link>}
                  </div>
                </div>
                {canAck && a.status === "open" && (
                  <Button variant="ghost" size="sm" onClick={() => ack([a.id])} disabled={pending} className="self-start">
                    <Check />טופל
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
