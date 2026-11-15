// LOCAL DEVELOPMENT ONLY: fills an empty local database with a sample catalogue and stock.
// Refuses to run against anything that is not a local Supabase.
// Usage: npm run seed:dev
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  console.error("✖ seed-dev runs only against a local Supabase (127.0.0.1 / localhost). Aborting.");
  process.exit(1);
}

const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const EMAIL = "admin@meatstock.local";
const PASSWORD = "Admin-12345";

async function ensureUser(email, password, role, fullName) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (data.users.some((u) => u.email === email)) return;
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role }, user_metadata: { full_name: fullName } });
  if (error) throw error;
}

await ensureUser(EMAIL, PASSWORD, "admin", "מנהל מערכת");
await ensureUser("seller@meatstock.local", "Seller-12345", "sales_employee", "עובד קופה");
await ensureUser("warehouse@meatstock.local", "Store-12345", "warehouse_worker", "עובד מחסן");

const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { error: loginError } = await db.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (loginError) throw loginError;

const { count } = await db.from("products").select("id", { count: "exact", head: true });
if (count) {
  console.log(`ℹ Database already has ${count} products – skipping catalogue seed.`);
  process.exit(0);
}

const must = (res) => {
  if (res.error) throw res.error;
  return res.data;
};
const insert = async (table, rows) => must(await db.from(table).insert(rows).select());
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

await db.from("app_settings").update({ store_name: "חנות המפעל – סניף ראשי" }).eq("id", 1);

const cats = await insert("categories", [
  { name: "בקר טרי", color: "#9b2c32", sort_order: 1 },
  { name: "עוף והודו", color: "#c9822b", sort_order: 2 },
  { name: "טלה", color: "#6f8f5a", sort_order: 3 },
  { name: "מעושנים ונקניקים", color: "#7a4f3a", sort_order: 4 },
  { name: "קפואים", color: "#4f78a8", sort_order: 5 },
]);
const cat = Object.fromEntries(cats.map((c) => [c.name, c.id]));

const levels = await insert("kosher_levels", [
  { name: "כשר", rank: 1 },
  { name: "מהדרין", rank: 2 },
  { name: "בד״ץ", rank: 3 },
]);
const lvl = Object.fromEntries(levels.map((l) => [l.name, l.id]));

const bodies = await insert("kosher_bodies", [
  { name: "בד״ץ העדה החרדית", level_id: lvl["בד״ץ"] },
  { name: "בד״ץ בית יוסף", level_id: lvl["בד״ץ"] },
  { name: "רבנות מהדרין", level_id: lvl["מהדרין"] },
  { name: "רבנות ראשית", level_id: lvl["כשר"] },
]);
const kb = Object.fromEntries(bodies.map((b) => [b.name, b.id]));

const suppliers = await insert("suppliers", [
  { name: "מפעל בקר הגליל", kind: "factory", contact_name: "מוקד הזמנות", phone: "04-0000000" },
  { name: "עוף הדרום", kind: "supplier", contact_name: "מחלקת מכירות", phone: "08-0000000" },
  { name: "מעדני השרון", kind: "both", phone: "09-0000000" },
]);
const sup = Object.fromEntries(suppliers.map((s) => [s.name, s.id]));

const certs = await insert("kosher_certificates", [
  { kosher_body_id: kb["בד״ץ העדה החרדית"], supplier_id: sup["מפעל בקר הגליל"], certificate_number: "EH-2026-114", valid_from: day(-200), valid_until: day(160) },
  { kosher_body_id: kb["רבנות מהדרין"], supplier_id: sup["עוף הדרום"], certificate_number: "RM-55871", valid_from: day(-300), valid_until: day(10) },
  { kosher_body_id: kb["בד״ץ בית יוסף"], supplier_id: sup["מעדני השרון"], certificate_number: "BY-3302", valid_from: day(-400), valid_until: day(220) },
]);
const cert = Object.fromEntries(certs.map((c) => [c.certificate_number, c.id]));

const [wh] = await insert("warehouses", [{ name: "מחסן ראשי", code: "MAIN", address: "קומת קרקע, מאחורי הקופה" }]);
const types = await insert("location_types", [{ name: "מקרר" }, { name: "מקפיא" }, { name: "חדר קירור" }, { name: "ויטרינה" }]);
const lt = Object.fromEntries(types.map((t) => [t.name, t.id]));
const locs = await insert("storage_locations", [
  { warehouse_id: wh.id, location_type_id: lt["חדר קירור"], name: "חדר קירור ראשי", code: "CR-1", zone: "A", temp_min: 0, temp_max: 4 },
  { warehouse_id: wh.id, location_type_id: lt["מקרר"], name: "מקרר עופות", code: "F-02", zone: "B", shelf: "1-3", temp_min: 0, temp_max: 3 },
  { warehouse_id: wh.id, location_type_id: lt["ויטרינה"], name: "ויטרינת תצוגה", code: "V-01", zone: "חנות", temp_min: 1, temp_max: 4 },
  { warehouse_id: wh.id, location_type_id: lt["מקפיא"], name: "מקפיא עמוק", code: "Z-01", zone: "C", temp_min: -24, temp_max: -18 },
]);
const loc = Object.fromEntries(locs.map((l) => [l.code, l.id]));

const products = await insert("products", [
  { name: "אנטריקוט מיושן", sku: "BF-101", barcode: "7290000000101", category_id: cat["בקר טרי"], sale_price_per_kg: 189.9, cost_price_per_kg: 128, min_stock_kg: 8 },
  { name: "פילה בקר", sku: "BF-102", barcode: "7290000000102", category_id: cat["בקר טרי"], sale_price_per_kg: 239.9, cost_price_per_kg: 165, min_stock_kg: 4 },
  { name: "צלי כתף", sku: "BF-103", barcode: "7290000000103", category_id: cat["בקר טרי"], sale_price_per_kg: 99.9, cost_price_per_kg: 64, min_stock_kg: 10 },
  { name: "בשר טחון טרי", sku: "BF-104", barcode: "7290000000104", category_id: cat["בקר טרי"], sale_price_per_kg: 69.9, cost_price_per_kg: 42, min_stock_kg: 15 },
  { name: "אסאדו", sku: "BF-105", barcode: "7290000000105", category_id: cat["בקר טרי"], sale_price_per_kg: 109.9, cost_price_per_kg: 72, min_stock_kg: 6 },
  { name: "חזה עוף", sku: "CH-201", barcode: "7290000000201", category_id: cat["עוף והודו"], sale_price_per_kg: 44.9, cost_price_per_kg: 27, min_stock_kg: 20 },
  { name: "שוקיים עוף", sku: "CH-202", barcode: "7290000000202", category_id: cat["עוף והודו"], sale_price_per_kg: 29.9, cost_price_per_kg: 16, min_stock_kg: 15 },
  { name: "פרגיות", sku: "CH-203", barcode: "7290000000203", category_id: cat["עוף והודו"], sale_price_per_kg: 59.9, cost_price_per_kg: 37, min_stock_kg: 12 },
  { name: "צלעות טלה", sku: "LM-301", barcode: "7290000000301", category_id: cat["טלה"], sale_price_per_kg: 169.9, cost_price_per_kg: 118, min_stock_kg: 3 },
  { name: "פסטרמה מעושנת", sku: "SM-401", barcode: "7290000000401", category_id: cat["מעושנים ונקניקים"], sale_price_per_kg: 119.9, cost_price_per_kg: 74, min_stock_kg: 4 },
  { name: "נקניקיות בקר", sku: "SM-402", barcode: "7290000000402", category_id: cat["מעושנים ונקניקים"], sale_price_per_kg: 54.9, cost_price_per_kg: 31, min_stock_kg: 6 },
  { name: "המבורגר קפוא", sku: "FR-501", barcode: "7290000000501", category_id: cat["קפואים"], sale_price_per_kg: 64.9, cost_price_per_kg: 38, min_stock_kg: 10 },
]);
const p = Object.fromEntries(products.map((x) => [x.sku, x]));

const line = (sku, kosher, certNo, expiry, qty, packages, location, productionOffset = -2) => ({
  product_id: p[sku].id,
  kosher_body_id: kb[kosher],
  kosher_certificate_id: certNo ? cert[certNo] : null,
  production_date: day(productionOffset),
  expiry_date: day(expiry),
  qty_kg: qty,
  packages,
  cost_price_per_kg: Number(p[sku].cost_price_per_kg),
  location_id: loc[location],
});

const receive = async (supplier, receivedOffset, deliveryNote, lines) =>
  must(await db.rpc("receive_goods", { p_receipt: { supplier_id: sup[supplier], received_date: day(receivedOffset), delivery_note_number: deliveryNote, lines } }));

await receive("מפעל בקר הגליל", -6, "DN-88120", [
  line("BF-101", "בד״ץ העדה החרדית", "EH-2026-114", 9, 24.35, 12, "CR-1", -8),
  line("BF-101", "בד״ץ העדה החרדית", "EH-2026-114", 2, 6.12, 3, "V-01", -12),
  line("BF-102", "בד״ץ העדה החרדית", "EH-2026-114", 12, 9.8, 6, "CR-1", -7),
  line("BF-103", "בד״ץ העדה החרדית", "EH-2026-114", 6, 31.5, 14, "CR-1", -7),
  line("BF-104", "רבנות ראשית", null, 3, 12.25, 25, "V-01", -3),
  line("BF-105", "בד״ץ העדה החרדית", "EH-2026-114", 13, 18.4, 8, "CR-1", -6),
]);
await receive("עוף הדרום", -2, "DN-4471", [
  line("CH-201", "רבנות מהדרין", "RM-55871", 5, 42.6, 30, "F-02", -2),
  line("CH-202", "רבנות מהדרין", "RM-55871", 4, 25.1, 18, "F-02", -2),
  line("CH-203", "רבנות מהדרין", "RM-55871", 6, 8.75, 7, "F-02", -2),
  line("CH-203", "בד״ץ העדה החרדית", null, 7, 14.2, 11, "F-02", -1),
]);
await receive("מעדני השרון", -20, "SH-1209", [
  line("LM-301", "בד״ץ בית יוסף", "BY-3302", -1, 2.4, 2, "CR-1", -25),
  line("SM-401", "בד״ץ בית יוסף", "BY-3302", 25, 11.3, 9, "CR-1", -21),
  line("SM-402", "בד״ץ בית יוסף", "BY-3302", 18, 5.1, 12, "V-01", -21),
  line("FR-501", "בד״ץ בית יוסף", "BY-3302", 160, 46, 46, "Z-01", -30),
]);

// A few of today's sales through the real sale function (FEFO batch choice).
const stock = must(await db.from("v_stock").select("*").eq("is_sellable", true).order("expiry_date"));
const pick = (sku, qty, discount = 0) => {
  const row = stock.find((s) => s.sku === sku && Number(s.qty_kg) >= qty);
  return { batch_id: row.batch_id, location_id: row.location_id, qty_kg: qty, packages: 0, discount_amount: discount };
};
for (const items of [
  [pick("BF-101", 1.234), pick("CH-201", 2.5)],
  [pick("BF-104", 1.5, 5), pick("CH-202", 3.25)],
  [pick("BF-102", 0.875), pick("SM-401", 0.4)],
  [pick("CH-203", 1.9)],
]) {
  must(await db.rpc("create_sale", { p_idempotency_key: crypto.randomUUID(), p_items: items, p_kosher_body_ids: [], p_sale_discount: 0 }));
}

must(await admin.rpc("generate_alerts"));
console.log("✔ Sample data created.");
console.log(`  admin:     ${EMAIL} / ${PASSWORD}`);
console.log("  seller:    seller@meatstock.local / Seller-12345");
console.log("  warehouse: warehouse@meatstock.local / Store-12345");
