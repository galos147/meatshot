"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isoDaysAgo, todayIso } from "@/lib/format";

const PRESETS = [
  { label: "היום", from: () => todayIso() },
  { label: "7 ימים", from: () => isoDaysAgo(6) },
  { label: "30 יום", from: () => isoDaysAgo(29) },
  { label: "חודש נוכחי", from: () => `${todayIso().slice(0, 8)}01` },
  { label: "שנה", from: () => isoDaysAgo(364) },
];

export function DateRangeForm({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (f: string, t: string) => router.push(`${pathname}?from=${f}&to=${t}`);

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-xs">
      {/* Phones: two equal columns, label above each input. Wider: one inline row. */}
      <div className="grid w-full grid-cols-2 gap-2 text-sm sm:flex sm:w-auto sm:items-center">
        <label className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-muted-foreground">מתאריך</span>
          <Input type="date" value={from} max={to} onChange={(e) => go(e.target.value, to)} className="h-9 w-full min-w-0 sm:w-40" />
        </label>
        <label className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-muted-foreground">עד</span>
          <Input type="date" value={to} min={from} onChange={(e) => go(from, e.target.value)} className="h-9 w-full min-w-0 sm:w-40" />
        </label>
      </div>
      <div className="flex flex-wrap gap-1 sm:ms-auto">
        {PRESETS.map((p) => (
          <Button key={p.label} variant="secondary" size="sm" onClick={() => go(p.from(), todayIso())}>{p.label}</Button>
        ))}
      </div>
    </div>
  );
}
