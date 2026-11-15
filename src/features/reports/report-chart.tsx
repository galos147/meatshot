"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ColumnType } from "./registry";
import { formatCell } from "./format-cell";

/**
 * Single-series bar chart (one hue – the brand primary, validated for contrast in light
 * and dark). Time buckets read along the x axis; categories become horizontal bars,
 * sorted, top 15, so long Hebrew names stay readable.
 */
export function ReportChart({
  data,
  x,
  y,
  label,
  type,
  orientation,
}: {
  data: Record<string, string | number | null>[];
  x: string;
  y: string;
  label: string;
  type: ColumnType;
  orientation: "time" | "category";
}) {
  const config = { value: { label, color: "var(--chart-1)" } } satisfies ChartConfig;
  const fmt = (v: unknown) => formatCell(type, v as number);
  const short = (v: unknown) => {
    const n = Number(v);
    return Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}K` : String(Math.round(n));
  };

  if (orientation === "category") {
    const rows = [...data]
      .map((d) => ({ name: String(d[x] ?? ""), value: Number(d[y] ?? 0) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
    if (rows.length === 0) return null;
    return (
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, rows.length * 34 + 30) }}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={short} reversed />
          <YAxis type="category" dataKey="name" orientation="right" width={140} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent hideIndicator formatter={(v) => <span className="num font-semibold">{fmt(v)}</span>} />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 0, 0, 4]} maxBarSize={22} />
        </BarChart>
      </ChartContainer>
    );
  }

  const rows = data.map((d) => ({ name: String(d[x] ?? ""), value: Number(d[y] ?? 0) }));
  if (rows.length === 0) return null;
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={rows} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tickFormatter={(v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8)}/${v.slice(5, 7)}` : /^\d{4}-\d{2}$/.test(v) ? `${v.slice(5)}/${v.slice(2, 4)}` : v)}
        />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={short} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent labelFormatter={(l) => formatCell(/\d{4}-\d{2}-\d{2}/.test(String(l)) ? "date" : "text", String(l))} formatter={(v) => <span className="num font-semibold">{fmt(v)}</span>} hideIndicator />}
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartContainer>
  );
}
