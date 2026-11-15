import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { storeDayRange } from "@/lib/format";
import type { Permission } from "@/lib/permissions";
import { TXN_LABELS } from "@/features/inventory/labels";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ColumnType = "text" | "code" | "kg" | "money" | "int" | "date" | "datetime" | "pct";
export type ReportColumn = { key: string; label: string; type: ColumnType; total?: boolean };
export type ReportRow = Record<string, string | number | null>;
export type ReportData = {
  columns: ReportColumn[];
  rows: ReportRow[];
  chart?: { x: string; y: string; label: string; type: ColumnType };
};
export type ReportDef = {
  slug: string;
  title: string;
  description: string;
  group: "מלאי" | "תפוגה" | "מכירות" | "כספים" | "יומן";
  permission?: Permission;
  dateRange?: boolean;
  load: (supabase: Supabase, range: { from: string; to: string }) => Promise<ReportData>;
};

const ok = <T>(res: { data: T | null; error: unknown }): T => {
  if (res.error) throw res.error;
  return (res.data ?? []) as T;
};

const n = (v: unknown) => Number(v ?? 0);

/** Calendar date of a timestamp in the store's timezone. */
const storeDate = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(ts));

async function stockRows(supabase: Supabase) {
  return ok(await supabase.from("v_stock").select("*").limit(20000));
}

async function salesInRange(supabase: Supabase, from: string, to: string) {
  const [start, end] = storeDayRange(from, to);
  return ok(
    await supabase
      .from("sales")
      .select("id, created_at, total, items_discount, sale_discount, sale_items(id, product_id, qty_kg, returned_qty_kg, line_total, products(name, category_id)), sale_returns(refund_amount)")
      .eq("status", "completed")
      .gte("created_at", start)
      .lt("created_at", end)
      .limit(20000),
  );
}

const stockLineColumns: ReportColumn[] = [
  { key: "product", label: "מוצר", type: "text" },
  { key: "batch", label: "אצווה", type: "code" },
  { key: "kosher", label: "הכשר", type: "text" },
  { key: "location", label: "מיקום", type: "text" },
  { key: "expiry", label: "תפוגה", type: "date" },
  { key: "days", label: "ימים לתפוגה", type: "int" },
  { key: "qty", label: "ק״ג", type: "kg", total: true },
  { key: "packages", label: "אריזות", type: "int", total: true },
];

type StockRow = Awaited<ReturnType<typeof stockRows>>[number];
const toStockLine = (r: StockRow): ReportRow => ({
  product: r.product_name,
  batch: r.batch_number,
  kosher: r.kosher_body_name,
  location: `${r.location_name} (${r.warehouse_name})`,
  expiry: r.expiry_date,
  days: r.days_to_expiry,
  qty: n(r.qty_kg),
  packages: n(r.packages),
});

export const REPORTS: ReportDef[] = [
  {
    slug: "inventory-summary",
    title: "מלאי כללי",
    description: "סה״כ מלאי לכל מוצר: כמות, אריזות, כשיר למכירה וסף מינימום",
    group: "מלאי",
    async load(supabase) {
      const rows = ok(await supabase.from("v_product_stock").select("*").eq("is_active", true).order("product_name"));
      return {
        columns: [
          { key: "product", label: "מוצר", type: "text" },
          { key: "sku", label: "מק״ט", type: "code" },
          { key: "category", label: "קטגוריה", type: "text" },
          { key: "qty", label: "סה״כ ק״ג", type: "kg", total: true },
          { key: "sellable", label: "כשיר למכירה", type: "kg", total: true },
          { key: "packages", label: "אריזות", type: "int", total: true },
          { key: "batches", label: "אצוות", type: "int", total: true },
          { key: "min", label: "מינימום", type: "kg" },
          { key: "status", label: "מצב", type: "text" },
        ],
        rows: rows.map((r) => ({
          product: r.product_name,
          sku: r.sku,
          category: r.category_name ?? "",
          qty: n(r.qty_kg),
          sellable: n(r.sellable_qty_kg),
          packages: n(r.packages),
          batches: n(r.batch_count),
          min: n(r.min_stock_kg),
          status: n(r.qty_kg) === 0 ? "אזל" : r.is_low_stock ? "נמוך" : "תקין",
        })),
        chart: { x: "product", y: "qty", label: "ק״ג במלאי", type: "kg" },
      };
    },
  },
  {
    slug: "inventory-by-location",
    title: "מלאי לפי מקרר",
    description: "כל המלאי בכל מקרר, מקפיא ומיקום – אצווה אחר אצווה",
    group: "מלאי",
    async load(supabase) {
      const rows = (await stockRows(supabase)).sort(
        (a, b) => (a.warehouse_name ?? "").localeCompare(b.warehouse_name ?? "", "he") || (a.location_code ?? "").localeCompare(b.location_code ?? "") || (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""),
      );
      return {
        columns: [{ key: "location", label: "מיקום", type: "text" }, ...stockLineColumns.filter((c) => c.key !== "location")],
        rows: rows.map(toStockLine),
      };
    },
  },
  {
    slug: "inventory-by-product",
    title: "מלאי לפי מוצר",
    description: "פירוט כל מוצר לפי אצוות ומיקומים",
    group: "מלאי",
    async load(supabase) {
      const rows = (await stockRows(supabase)).sort(
        (a, b) => (a.product_name ?? "").localeCompare(b.product_name ?? "", "he") || (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""),
      );
      return { columns: stockLineColumns, rows: rows.map(toStockLine) };
    },
  },
  {
    slug: "inventory-by-kosher",
    title: "מלאי לפי הכשר",
    description: "כמה מלאי יש מכל גוף הכשר, לפי מוצר",
    group: "מלאי",
    async load(supabase) {
      const map = new Map<string, ReportRow>();
      for (const r of await stockRows(supabase)) {
        const key = `${r.kosher_body_id}:${r.product_id}`;
        const row = map.get(key) ?? { kosher: r.kosher_body_name, product: r.product_name, batches: 0, qty: 0, packages: 0, _b: "" };
        row.qty = n(row.qty) + n(r.qty_kg);
        row.packages = n(row.packages) + n(r.packages);
        if (!String(row._b).includes(r.batch_id!)) {
          row._b = `${row._b},${r.batch_id}`;
          row.batches = n(row.batches) + 1;
        }
        map.set(key, row);
      }
      const rows = [...map.values()]
        .map((r) => {
          const { _b, ...rest } = r;
          void _b;
          return rest;
        })
        .sort((a, b) => String(a.kosher).localeCompare(String(b.kosher), "he") || String(a.product).localeCompare(String(b.product), "he"));
      return {
        columns: [
          { key: "kosher", label: "הכשר", type: "text" },
          { key: "product", label: "מוצר", type: "text" },
          { key: "batches", label: "אצוות", type: "int", total: true },
          { key: "qty", label: "ק״ג", type: "kg", total: true },
          { key: "packages", label: "אריזות", type: "int", total: true },
        ],
        rows,
      };
    },
  },
  {
    slug: "inventory-by-batch",
    title: "מלאי לפי אצווה",
    description: "כל האצוות שיש מהן מלאי: ספק, הכשר, תאריכים, כמות שהתקבלה ונותרה",
    group: "מלאי",
    async load(supabase) {
      const rows = ok(await supabase.from("v_batches").select("*").gt("qty_kg", 0).order("expiry_date").limit(20000));
      return {
        columns: [
          { key: "batch", label: "אצווה", type: "code" },
          { key: "product", label: "מוצר", type: "text" },
          { key: "supplier", label: "ספק", type: "text" },
          { key: "kosher", label: "הכשר", type: "text" },
          { key: "received", label: "התקבל", type: "date" },
          { key: "expiry", label: "תפוגה", type: "date" },
          { key: "initial", label: "התקבל ק״ג", type: "kg", total: true },
          { key: "qty", label: "נותר ק״ג", type: "kg", total: true },
          { key: "locations", label: "מיקומים", type: "text" },
        ],
        rows: rows.map((b) => ({
          batch: b.batch_number,
          product: b.product_name,
          supplier: b.supplier_name,
          kosher: b.kosher_body_name,
          received: b.received_date,
          expiry: b.expiry_date,
          initial: n(b.initial_qty_kg),
          qty: n(b.qty_kg),
          locations: (b.location_names ?? []).join(", "),
        })),
      };
    },
  },
  {
    slug: "expired",
    title: "מוצרים שפג תוקפם",
    description: "מלאי שתאריך התפוגה שלו עבר – חסום למכירה, יש להשמיד",
    group: "תפוגה",
    async load(supabase) {
      const rows = (await stockRows(supabase)).filter((r) => n(r.days_to_expiry) < 0).sort((a, b) => n(a.days_to_expiry) - n(b.days_to_expiry));
      return { columns: stockLineColumns, rows: rows.map(toStockLine) };
    },
  },
  {
    slug: "expiring",
    title: "מוצרים שעומדים לפוג",
    description: "מלאי שיפוג ב-14 הימים הקרובים, מהקרוב לרחוק",
    group: "תפוגה",
    async load(supabase) {
      const rows = (await stockRows(supabase))
        .filter((r) => n(r.days_to_expiry) >= 0 && n(r.days_to_expiry) <= 14)
        .sort((a, b) => n(a.days_to_expiry) - n(b.days_to_expiry));
      return { columns: stockLineColumns, rows: rows.map(toStockLine) };
    },
  },
  {
    slug: "sales-daily",
    title: "מכירות יומיות",
    description: "מספר מכירות, משקל, הנחות ופדיון לכל יום",
    group: "מכירות",
    dateRange: true,
    async load(supabase, { from, to }) {
      return aggregateSales(await salesInRange(supabase, from, to), (ts) => storeDate(ts), "יום", "date");
    },
  },
  {
    slug: "sales-monthly",
    title: "מכירות חודשיות",
    description: "סיכום מכירות לכל חודש",
    group: "מכירות",
    dateRange: true,
    async load(supabase, { from, to }) {
      return aggregateSales(await salesInRange(supabase, from, to), (ts) => storeDate(ts).slice(0, 7), "חודש", "text");
    },
  },
  {
    slug: "stock-value",
    title: "שווי מלאי",
    description: "שווי המלאי הנוכחי לפי מחיר עלות ומחיר מכירה, לפי קטגוריה",
    group: "כספים",
    permission: "reports.financial",
    async load(supabase) {
      const map = new Map<string, ReportRow>();
      for (const r of await stockRows(supabase)) {
        const key = r.category_name ?? "ללא קטגוריה";
        const row = map.get(key) ?? { category: key, qty: 0, cost: 0, sale: 0, margin: 0 };
        row.qty = n(row.qty) + n(r.qty_kg);
        row.cost = n(row.cost) + n(r.cost_value);
        row.sale = n(row.sale) + n(r.sale_value);
        map.set(key, row);
      }
      const rows = [...map.values()].map((r): ReportRow => ({ ...r, margin: n(r.sale) - n(r.cost) })).sort((a, b) => n(b.cost) - n(a.cost));
      return {
        columns: [
          { key: "category", label: "קטגוריה", type: "text" },
          { key: "qty", label: "ק״ג", type: "kg", total: true },
          { key: "cost", label: "שווי בעלות", type: "money", total: true },
          { key: "sale", label: "שווי במכירה", type: "money", total: true },
          { key: "margin", label: "רווח פוטנציאלי", type: "money", total: true },
        ],
        rows,
        chart: { x: "category", y: "cost", label: "שווי בעלות", type: "money" },
      };
    },
  },
  {
    slug: "gross-profit",
    title: "רווח גולמי משוער",
    description: "לפי מוצר: פדיון נטו (אחרי החזרות), עלות לפי האצווה שנמכרה, רווח ושיעור רווח",
    group: "כספים",
    permission: "reports.financial",
    dateRange: true,
    async load(supabase, { from, to }) {
      const map = new Map<string, ReportRow>();
      // Cost per sold line: rows come back for admin / store_manager only.
      const [start, end] = storeDayRange(from, to);
      const costs = ok(await supabase.from("v_sale_item_costs").select("sale_item_id, cost_per_kg").gte("sold_at", start).lt("sold_at", end).limit(100000));
      const costByItem = new Map(costs.map((c) => [c.sale_item_id, n(c.cost_per_kg)]));
      for (const s of await salesInRange(supabase, from, to)) {
        // The sale-level discount reduces revenue proportionally across lines.
        const linesTotal = s.sale_items.reduce((sum, i) => sum + n(i.line_total), 0);
        const saleFactor = linesTotal > 0 ? n(s.total) / linesTotal : 1;
        for (const i of s.sale_items) {
          const net = n(i.qty_kg) - n(i.returned_qty_kg);
          if (net <= 0) continue;
          const share = net / n(i.qty_kg);
          const row = map.get(i.product_id) ?? { product: i.products?.name ?? "", qty: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
          row.qty = n(row.qty) + net;
          row.revenue = n(row.revenue) + n(i.line_total) * share * saleFactor;
          row.cost = n(row.cost) + net * (costByItem.get(i.id) ?? 0);
          map.set(i.product_id, row);
        }
      }
      const rows = [...map.values()]
        .map((r) => {
          const profit = n(r.revenue) - n(r.cost);
          return { ...r, revenue: Math.round(n(r.revenue) * 100) / 100, cost: Math.round(n(r.cost) * 100) / 100, profit: Math.round(profit * 100) / 100, margin: n(r.revenue) ? profit / n(r.revenue) : 0 };
        })
        .sort((a, b) => b.profit - a.profit);
      return {
        columns: [
          { key: "product", label: "מוצר", type: "text" },
          { key: "qty", label: "ק״ג שנמכרו", type: "kg", total: true },
          { key: "revenue", label: "פדיון", type: "money", total: true },
          { key: "cost", label: "עלות", type: "money", total: true },
          { key: "profit", label: "רווח גולמי", type: "money", total: true },
          { key: "margin", label: "% רווח", type: "pct" },
        ],
        rows,
        chart: { x: "product", y: "profit", label: "רווח גולמי", type: "money" },
      };
    },
  },
  {
    slug: "transactions",
    title: "היסטוריית תנועות",
    description: "כל תנועות המלאי בטווח התאריכים",
    group: "יומן",
    dateRange: true,
    async load(supabase, { from, to }) {
      const [start, end] = storeDayRange(from, to);
      const rows = ok(await supabase.from("v_transactions").select("*").gte("created_at", start).lt("created_at", end).order("id").limit(20000));
      return {
        columns: [
          { key: "id", label: "#", type: "int" },
          { key: "when", label: "מועד", type: "datetime" },
          { key: "type", label: "סוג", type: "text" },
          { key: "product", label: "מוצר", type: "text" },
          { key: "batch", label: "אצווה", type: "code" },
          { key: "location", label: "מיקום", type: "text" },
          { key: "qty", label: "שינוי ק״ג", type: "kg", total: true },
          { key: "packages", label: "שינוי אריזות", type: "int", total: true },
          { key: "by", label: "עובד", type: "text" },
          { key: "reason", label: "סיבה", type: "text" },
        ],
        rows: rows.map((t) => ({
          id: t.id,
          when: t.created_at,
          type: TXN_LABELS[t.txn_type!],
          product: t.product_name,
          batch: t.batch_number,
          location: t.location_name,
          qty: n(t.qty_kg_delta),
          packages: n(t.packages_delta),
          by: t.created_by_name,
          reason: t.reason ?? "",
        })),
      };
    },
  },
];

function aggregateSales(
  sales: Awaited<ReturnType<typeof salesInRange>>,
  bucket: (ts: string) => string,
  label: string,
  type: ColumnType,
): ReportData {
  const map = new Map<string, ReportRow>();
  for (const s of sales) {
    const key = bucket(s.created_at);
    const row = map.get(key) ?? { period: key, count: 0, kg: 0, discount: 0, refunds: 0, total: 0, net: 0 };
    row.count = n(row.count) + 1;
    row.kg = n(row.kg) + s.sale_items.reduce((sum, i) => sum + n(i.qty_kg) - n(i.returned_qty_kg), 0);
    row.discount = n(row.discount) + n(s.items_discount) + n(s.sale_discount);
    const refunds = s.sale_returns.reduce((sum, r) => sum + n(r.refund_amount), 0);
    row.refunds = n(row.refunds) + refunds;
    row.total = n(row.total) + n(s.total);
    row.net = n(row.net) + n(s.total) - refunds;
    map.set(key, row);
  }
  return {
    columns: [
      { key: "period", label, type },
      { key: "count", label: "מכירות", type: "int", total: true },
      { key: "kg", label: "ק״ג נטו", type: "kg", total: true },
      { key: "discount", label: "הנחות", type: "money", total: true },
      { key: "refunds", label: "החזרים", type: "money", total: true },
      { key: "net", label: "פדיון נטו", type: "money", total: true },
    ],
    rows: [...map.values()].sort((a, b) => String(a.period).localeCompare(String(b.period))),
    chart: { x: "period", y: "net", label: "פדיון נטו", type: "money" },
  };
}

export const getReport = (slug: string) => REPORTS.find((r) => r.slug === slug);
