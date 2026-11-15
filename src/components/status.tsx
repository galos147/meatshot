import { AlertTriangle, CheckCircle2, CircleSlash, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysLabel, formatDate } from "@/lib/format";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  success: "bg-success/12 text-[oklch(0.42_0.11_155)] ring-success/25 dark:text-success",
  warning: "bg-warning/18 text-warning-foreground ring-warning/35 dark:text-warning",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  info: "bg-info/10 text-info ring-info/25",
  primary: "bg-primary/10 text-primary ring-primary/20",
};

export function Pill({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset [&>svg]:size-3.5",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Pill tone="success"><CheckCircle2 />פעיל</Pill>
  ) : (
    <Pill tone="neutral"><CircleSlash />לא פעיל</Pill>
  );
}

export function expiryTone(days: number | null | undefined): Tone {
  if (days === null || days === undefined) return "neutral";
  if (days < 0) return "danger";
  if (days <= 3) return "danger";
  if (days <= 7) return "warning";
  if (days <= 14) return "info";
  return "success";
}

export function ExpiryBadge({ date, days, showDate = true }: { date: string | null; days: number | null; showDate?: boolean }) {
  const tone = expiryTone(days);
  const Icon = days !== null && days < 0 ? XCircle : days !== null && days <= 7 ? AlertTriangle : Clock;
  return (
    <div className="flex flex-col items-start gap-0.5">
      {showDate && <span className="num text-sm">{formatDate(date)}</span>}
      <Pill tone={tone}><Icon />{daysLabel(days)}</Pill>
    </div>
  );
}
