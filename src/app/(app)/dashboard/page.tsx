import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bell, Boxes, CalendarClock, PackageMinus, PackagePlus, Receipt, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ExpiryBadge, Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportChart } from "@/features/reports/report-chart";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDateTime, formatKg, isoDaysAgo, storeDayRange, todayIso } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "לוח בקרה" };

const storeDate = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(ts));

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Jerusalem" }).format(new Date()));
  return h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : h < 21 ? "ערב טוב" : "לילה טוב";
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const supabase = await createClient();
  const today = todayIso();
  const [start14, end] = storeDayRange(isoDaysAgo(13), today);
  const financial = can(user.role, "reports.financial");

  const [{ data: sales }, { data: saleCosts }, { data: products }, { data: expiring }, { data: alerts }, { data: recent }] = await Promise.all([
    supabase.from("sales").select("id, created_at, total, status, sale_returns(refund_amount)").gte("created_at", start14).lt("created_at", end).limit(20000),
    // Cost: rows come back for admin / store_manager only.
    supabase.from("v_sale_costs").select("sale_id, total_cost").gte("created_at", start14).lt("created_at", end).limit(20000),
    supabase.from("v_product_stock").select("product_id, product_name, qty_kg, sellable_qty_kg, min_stock_kg, is_low_stock, cost_value, batch_count").eq("is_active", true),
    supabase.from("v_stock").select("batch_id, location_id, batch_number, product_name, location_name, expiry_date, days_to_expiry, qty_kg").lte("days_to_expiry", 7).order("expiry_date").limit(8),
    supabase.from("alerts").select("severity").eq("status", "open"),
    supabase.from("sales").select("id, sale_number, created_at, total, status, profiles!sales_created_by_fkey(full_name)").order("created_at", { ascending: false }).limit(6),
  ]);

  const completed = (sales ?? []).filter((s) => s.status === "completed");
  const net = (s: (typeof completed)[number]) => Number(s.total) - s.sale_returns.reduce((x, r) => x + Number(r.refund_amount), 0);
  const todays = completed.filter((s) => storeDate(s.created_at) === today);
  const yesterday = completed.filter((s) => storeDate(s.created_at) === isoDaysAgo(1));
  const todayTotal = todays.reduce((s, x) => s + net(x), 0);
  const yTotal = yesterday.reduce((s, x) => s + net(x), 0);
  const costBySale = new Map((saleCosts ?? []).map((c) => [c.sale_id, Number(c.total_cost)]));
  const todayProfit = todays.reduce((s, x) => s + Number(x.total) - (costBySale.get(x.id) ?? 0), 0);

  const byDay = new Map<string, number>();
  for (let i = 13; i >= 0; i--) byDay.set(isoDaysAgo(i), 0);
  for (const s of completed) {
    const d = storeDate(s.created_at);
    if (byDay.has(d)) byDay.set(d, byDay.get(d)! + net(s));
  }
  const chart = [...byDay.entries()].map(([period, value]) => ({ period, net: Math.round(value * 100) / 100 }));

  const stockKg = (products ?? []).reduce((s, p) => s + Number(p.qty_kg), 0);
  const stockValue = (products ?? []).reduce((s, p) => s + Number(p.cost_value), 0);
  const low = (products ?? []).filter((p) => p.is_low_stock).sort((a, b) => Number(a.sellable_qty_kg) / Number(a.min_stock_kg) - Number(b.sellable_qty_kg) / Number(b.min_stock_kg));
  const critical = (alerts ?? []).filter((a) => a.severity === "critical").length;
  const delta = yTotal > 0 ? Math.round(((todayTotal - yTotal) / yTotal) * 100) : null;

  return (
    <>
      {denied && (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">אין לך הרשאה למסך שביקשת. פנו למנהל המערכת אם צריך גישה.</div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" }).format(new Date())}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{greeting()}, {user.fullName.split(" ")[0]}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user.role, "stock.receive") && <Button asChild variant="outline" size="lg"><Link href="/receiving/new"><PackagePlus />קבלת סחורה</Link></Button>}
          {can(user.role, "sales.create") && <Button asChild size="lg" className="shadow-sm shadow-primary/25"><Link href="/sales/new"><ShoppingCart />מכירה חדשה</Link></Button>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="מכירות היום"
          value={formatCurrency(todayTotal)}
          icon={Wallet}
          href="/sales"
          hint={
            <span>
              {todays.length} מכירות
              {delta !== null && <span className={delta >= 0 ? "text-[oklch(0.45_0.11_155)]" : "text-destructive"}> · {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% מאתמול</span>}
            </span>
          }
        />
        {financial ? (
          <StatCard label="רווח גולמי היום" value={formatCurrency(todayProfit)} icon={TrendingUp} accent="success" hint="משוער, לפי עלות האצוות" />
        ) : (
          <StatCard label="מוצרים במלאי נמוך" value={low.length} icon={PackageMinus} accent={low.length ? "warning" : "success"} href="/inventory" />
        )}
        <StatCard
          label="מלאי כולל"
          value={formatKg(stockKg)}
          icon={Boxes}
          accent="info"
          href="/inventory"
          hint={financial ? `שווי עלות ${formatCurrency(stockValue)}` : `${(products ?? []).reduce((s, p) => s + Number(p.batch_count), 0)} אצוות`}
        />
        <StatCard
          label="התראות פתוחות"
          value={alerts?.length ?? 0}
          icon={Bell}
          accent={critical ? "danger" : alerts?.length ? "warning" : "success"}
          href="/alerts"
          hint={critical ? `${critical} דחופות` : "אין התראות דחופות"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>פדיון נטו – 14 ימים אחרונים</CardTitle>
            <CardDescription>אחרי החזרות, ללא מכירות שבוטלו</CardDescription>
            <CardAction><Button asChild variant="ghost" size="sm"><Link href="/reports/sales-daily">לדוח המלא<ArrowLeft /></Link></Button></CardAction>
          </CardHeader>
          <CardContent>
            <ReportChart data={chart} x="period" y="net" label="פדיון נטו" type="money" orientation="time" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-destructive" />תפוגה קרובה</CardTitle>
            <CardDescription>7 ימים קרובים ומה שכבר פג</CardDescription>
            <CardAction><Button asChild variant="ghost" size="sm"><Link href="/reports/expiring">הכול<ArrowLeft /></Link></Button></CardAction>
          </CardHeader>
          <CardContent>
            {(expiring ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">אין מלאי שעומד לפוג 🎉</p>
            ) : (
              <ul className="divide-y">
                {(expiring ?? []).map((e) => (
                  <li key={`${e.batch_id}:${e.location_id}`}>
                    <Link href={`/batches/${e.batch_id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{e.product_name}</div>
                        <div className="text-xs text-muted-foreground"><span className="ltr font-mono">{e.batch_number}</span> · {e.location_name} · <span className="num">{formatKg(e.qty_kg)}</span></div>
                      </div>
                      <ExpiryBadge date={e.expiry_date} days={e.days_to_expiry} showDate={false} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PackageMinus className="size-4 text-warning-foreground dark:text-warning" />מלאי נמוך</CardTitle>
            <CardDescription>מוצרים מתחת לסף המינימום (רק מלאי כשיר נספר)</CardDescription>
          </CardHeader>
          <CardContent>
            {low.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">כל המוצרים מעל סף המינימום</p>
            ) : (
              <ul className="space-y-3">
                {low.slice(0, 6).map((p) => {
                  const pct = Math.min(100, (Number(p.sellable_qty_kg) / Number(p.min_stock_kg)) * 100);
                  return (
                    <li key={p.product_id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{p.product_name}</span>
                        <span className="num text-muted-foreground">{formatKg(p.sellable_qty_kg)} / {formatKg(p.min_stock_kg)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${pct < 34 ? "bg-destructive" : "bg-warning"}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="size-4 text-primary" />מכירות אחרונות</CardTitle>
            <CardAction><Button asChild variant="ghost" size="sm"><Link href="/sales">הכול<ArrowLeft /></Link></Button></CardAction>
          </CardHeader>
          <CardContent>
            {(recent ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">עדיין אין מכירות</p>
            ) : (
              <ul className="divide-y">
                {(recent ?? []).map((s) => (
                  <li key={s.id}>
                    <Link href={`/sales/${s.id}`} className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-muted/60">
                      <div>
                        <div className="text-sm font-medium">מכירה #{s.sale_number} {s.status === "cancelled" && <Pill tone="neutral">בוטלה</Pill>}</div>
                        <div className="text-xs text-muted-foreground"><span className="num">{formatDateTime(s.created_at)}</span> · {s.profiles?.full_name}</div>
                      </div>
                      <span className="num font-semibold">{formatCurrency(s.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
