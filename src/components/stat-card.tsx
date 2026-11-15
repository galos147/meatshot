import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const accents = {
  primary: "from-primary/15 to-primary/5 text-primary ring-primary/15",
  success: "from-success/20 to-success/5 text-[oklch(0.45_0.11_155)] ring-success/20 dark:text-success",
  warning: "from-warning/25 to-warning/5 text-[oklch(0.5_0.12_65)] ring-warning/25 dark:text-warning",
  danger: "from-destructive/15 to-destructive/5 text-destructive ring-destructive/15",
  info: "from-info/15 to-info/5 text-info ring-info/15",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  accent?: keyof typeof accents;
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-all",
        href && "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="num mt-2 text-start text-2xl font-bold tracking-tight md:text-[1.7rem]">{value}</p>
          {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1", accents[accent])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</Link> : body;
}
