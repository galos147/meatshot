import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, FileBarChart, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCell, isNumeric } from "@/features/reports/format-cell";
import { getReport } from "@/features/reports/registry";
import { ReportChart } from "@/features/reports/report-chart";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime, isoDaysAgo, todayIso } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DateRangeForm } from "./date-range-form";

export async function generateMetadata({ params }: PageProps<"/reports/[slug]">): Promise<Metadata> {
  return { title: getReport((await params).slug)?.title ?? "דוח" };
}

export default async function ReportPage({ params, searchParams }: PageProps<"/reports/[slug]">) {
  const user = await requireUser();
  const { slug } = await params;
  const report = getReport(slug);
  if (!report) notFound();
  if (report.permission && !can(user.role, report.permission)) redirect("/reports");

  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : isoDaysAgo(29);
  const to = typeof sp.to === "string" ? sp.to : todayIso();
  const supabase = await createClient();
  const data = await report.load(supabase, { from, to });

  const totals = Object.fromEntries(
    data.columns.filter((c) => c.total).map((c) => [c.key, data.rows.reduce((s, r) => s + Number(r[c.key] ?? 0), 0)]),
  );
  const hasTotals = Object.keys(totals).length > 0;
  const exportHref = `/reports/${slug}/export?${new URLSearchParams(report.dateRange ? { from, to } : {}).toString()}`;
  const timeChart = data.chart && ["period"].includes(data.chart.x);

  return (
    <>
      <PageHeader
        icon={FileBarChart}
        title={report.title}
        description={report.description}
        actions={
          <>
            <Button asChild variant="outline" size="lg" className="no-print">
              <a href={exportHref}><FileSpreadsheet />ייצוא ל-Excel</a>
            </Button>
            <PrintButton label="הדפסה / PDF" />
            <Button asChild variant="ghost" size="lg" className="no-print"><Link href="/reports"><ArrowRight />כל הדוחות</Link></Button>
          </>
        }
      />

      {/* Print header */}
      <div className="mb-4 hidden print:block">
        <h1 className="text-2xl font-bold">{report.title}</h1>
        <p className="text-sm">
          {report.dateRange ? `${formatDate(from)} – ${formatDate(to)} · ` : ""}הופק {formatDateTime(new Date())}
        </p>
      </div>

      {report.dateRange && <DateRangeForm from={from} to={to} />}

      {data.chart && data.rows.length > 0 && (
        <Card className="mb-6 print:break-inside-avoid">
          <CardHeader><CardTitle className="text-base">{data.chart.label}</CardTitle></CardHeader>
          <CardContent>
            <ReportChart data={data.rows} x={data.chart.x} y={data.chart.y} label={data.chart.label} type={data.chart.type} orientation={timeChart ? "time" : "category"} />
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {data.columns.map((c) => (
                <TableHead key={c.key} className={cn("text-xs font-semibold", isNumeric(c.type) && "text-end")}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 && (
              <TableRow><TableCell colSpan={data.columns.length} className="py-14 text-center text-muted-foreground">אין נתונים לדוח זה</TableCell></TableRow>
            )}
            {data.rows.map((row, i) => (
              <TableRow key={i}>
                {data.columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn(
                      isNumeric(c.type) && "num text-end",
                      c.type === "code" && "ltr font-mono text-xs",
                      c.type === "kg" && Number(row[c.key]) < 0 && "text-destructive",
                    )}
                  >
                    {formatCell(c.type, row[c.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {hasTotals && data.rows.length > 0 && (
            <TableFooter>
              <TableRow>
                {data.columns.map((c, i) => (
                  <TableCell key={c.key} className={cn("font-bold", isNumeric(c.type) && "num text-end")}>
                    {c.key in totals ? formatCell(c.type, totals[c.key]) : i === 0 ? `סה״כ (${data.rows.length} שורות)` : ""}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </>
  );
}
