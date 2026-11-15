import { describe, expect, it } from "vitest";
import { receiptSchema, transferSchema } from "@/features/inventory/schemas";
import { saleSchema } from "@/features/sales/schemas";
import { settingsSchema } from "@/features/settings/schemas";
import { weightKg } from "@/lib/validation";

const id = () => crypto.randomUUID();

describe("weightKg", () => {
  const w = weightKg();
  it("accepts up to three decimals and coerces strings", () => {
    expect(w.parse("1.234")).toBe(1.234);
    expect(w.parse(0.001)).toBe(0.001);
  });
  it("rejects zero, negatives and a fourth decimal", () => {
    expect(w.safeParse(0).success).toBe(false);
    expect(w.safeParse(-1).success).toBe(false);
    expect(w.safeParse("1.2345").success).toBe(false);
    expect(w.safeParse("abc").success).toBe(false);
  });
});

describe("receiptSchema", () => {
  const line = { product_id: id(), kosher_body_id: id(), location_id: id(), expiry_date: "2026-12-01", qty_kg: "5", packages: "2", cost_price_per_kg: "80" };
  it("parses a valid receipt", () => {
    const r = receiptSchema.parse({ supplier_id: id(), received_date: "2026-11-14", lines: [line] });
    expect(r.lines[0]).toMatchObject({ qty_kg: 5, packages: 2, cost_price_per_kg: 80 });
  });
  it("requires at least one line", () => {
    expect(receiptSchema.safeParse({ supplier_id: id(), received_date: "2026-11-14", lines: [] }).success).toBe(false);
  });
  it("rejects expiry before the receiving date", () => {
    const res = receiptSchema.safeParse({ supplier_id: id(), received_date: "2026-11-14", lines: [{ ...line, expiry_date: "2026-11-01" }] });
    expect(res.success).toBe(false);
  });
});

describe("saleSchema", () => {
  it("rejects an empty cart and a missing idempotency key", () => {
    expect(saleSchema.safeParse({ idempotency_key: id(), items: [] }).success).toBe(false);
    expect(saleSchema.safeParse({ items: [{ batch_id: id(), location_id: id(), qty_kg: 1 }] }).success).toBe(false);
  });
  it("rejects negative discounts", () => {
    const res = saleSchema.safeParse({ idempotency_key: id(), items: [{ batch_id: id(), location_id: id(), qty_kg: 1, discount_amount: -1 }] });
    expect(res.success).toBe(false);
  });
});

describe("transferSchema", () => {
  it("rejects moving to the same location", () => {
    const loc = id();
    expect(transferSchema.safeParse({ batch_id: id(), from_location_id: loc, to_location_id: loc, qty_kg: 1 }).success).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("parses alert days from text, dedupes and sorts descending", () => {
    expect(settingsSchema.parse({ store_name: "x", expiry_alert_days: "3, 14,7 7", default_min_stock_kg: 0 }).expiry_alert_days).toEqual([14, 7, 3]);
  });
});

describe("optional fields", () => {
  it("may be omitted, empty or null and come out as null", async () => {
    const { locationSchema, supplierSchema } = await import("@/features/catalog/schemas");
    const loc = locationSchema.parse({ warehouse_id: id(), name: "מקרר", code: "F1" });
    expect(loc).toMatchObject({ location_type_id: null, temp_min: null, temp_max: null });
    expect(locationSchema.parse({ warehouse_id: id(), name: "מקפיא", code: "Z1", temp_min: "-20", temp_max: "" })).toMatchObject({ temp_min: -20, temp_max: null });
    expect(supplierSchema.parse({ name: "ספק", email: "" }).email).toBeNull();
  });
});
