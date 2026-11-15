import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { getReport, type ColumnType } from "@/features/reports/registry";
import { getCurrentUser } from "@/lib/auth";
import { isoDaysAgo, todayIso } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const NUM_FMT: Partial<Record<ColumnType, string>> = {
  kg: "#,##0.000",
  money: '#,##0.00 "₪"',
  int: "#,##0",
  pct: "0.0%",
};

/** Excel export of any report – same data loader as the screen, RTL worksheet. */
export async function GET(request: NextRequest, ctx: RouteContext<"/reports/[slug]/export">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const report = getReport(slug);
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (report.permission && !can(user.role, report.permission)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const range = { from: sp.get("from") ?? isoDaysAgo(29), to: sp.get("to") ?? todayIso() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.from) || !/^\d{4}-\d{2}-\d{2}$/.test(range.to)) {
    return NextResponse.json({ error: "bad date" }, { status: 400 });
  }
  const data = await report.load(await createClient(), range);

  const wb = new ExcelJS.Workbook();
  wb.creator = "MEAT STOCK";
  wb.created = new Date();
  const ws = wb.addWorksheet(report.title.slice(0, 31), { views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }] });

  ws.mergeCells(1, 1, 1, Math.max(1, data.columns.length));
  ws.getCell(1, 1).value = report.title + (report.dateRange ? ` (${range.from} – ${range.to})` : "");
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.addRow([]);

  const header = ws.addRow(data.columns.map((c) => c.label));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8B1E2B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  for (const row of data.rows) {
    ws.addRow(
      data.columns.map((c) => {
        const v = row[c.key];
        if (v === null || v === undefined) return null;
        if (c.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return new Date(`${v}T00:00:00Z`);
        if (c.type === "datetime") return new Date(String(v));
        return v;
      }),
    );
  }

  if (data.columns.some((c) => c.total) && data.rows.length) {
    const first = 4;
    const last = 3 + data.rows.length;
    const totalRow = ws.addRow(
      data.columns.map((c, i) => {
        if (c.total) {
          const col = ws.getColumn(i + 1).letter;
          return { formula: `SUM(${col}${first}:${col}${last})` };
        }
        return i === 0 ? "סה״כ" : null;
      }),
    );
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => (cell.border = { top: { style: "thin" } }));
  }

  data.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.min(40, Math.max(12, c.label.length + 4, ...data.rows.slice(0, 200).map((r) => String(r[c.key] ?? "").length + 2)));
    if (NUM_FMT[c.type]) col.numFmt = NUM_FMT[c.type]!;
    if (c.type === "date") col.numFmt = "dd/mm/yyyy";
    if (c.type === "datetime") col.numFmt = "dd/mm/yyyy hh:mm";
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `${slug}-${todayIso()}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(report.title)}.xlsx`,
      "Cache-Control": "no-store",
    },
  });
}
