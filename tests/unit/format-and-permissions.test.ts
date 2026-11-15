import { describe, expect, it } from "vitest";
import { toHebrewError } from "@/lib/errors";
import { daysLabel, formatDate, storeDayRange, storeDayStart } from "@/lib/format";
import { can } from "@/lib/permissions";

describe("store timezone boundaries (Asia/Jerusalem)", () => {
  it("winter day starts at 22:00 UTC the previous day", () => {
    expect(storeDayStart("2026-01-15")).toBe("2026-01-14T22:00:00.000Z");
  });
  it("summer day starts at 21:00 UTC the previous day", () => {
    expect(storeDayStart("2026-07-15")).toBe("2026-07-14T21:00:00.000Z");
  });
  it("range end is the start of the day after `to`", () => {
    expect(storeDayRange("2026-01-01", "2026-01-31")).toEqual(["2025-12-31T22:00:00.000Z", "2026-01-31T22:00:00.000Z"]);
  });
});

describe("formatting", () => {
  it("formats DB dates without timezone shifts", () => {
    expect(formatDate("2026-03-01")).toBe("01/03/2026");
  });
  it("describes days to expiry in Hebrew", () => {
    expect(daysLabel(-2)).toBe("פג לפני 2 ימים");
    expect(daysLabel(0)).toBe("פג היום");
    expect(daysLabel(5)).toBe("בעוד 5 ימים");
  });
});

describe("toHebrewError", () => {
  it("passes our own (Hebrew) business errors through", () => {
    expect(toHebrewError({ code: "P0001", message: "אין מספיק מלאי" })).toBe("אין מספיק מלאי");
  });
  it("translates constraint violations", () => {
    expect(toHebrewError({ code: "23505", details: "Key (sku)=(X) already exists." })).toBe('מק"ט זה כבר קיים');
    expect(toHebrewError({ code: "42501", message: "permission denied" })).toContain("הרשאה");
  });
});

describe("permissions matrix", () => {
  it("matches the roles described in the spec", () => {
    expect(can("sales_employee", "sales.create")).toBe(true);
    expect(can("sales_employee", "sales.cancel")).toBe(false);
    expect(can("warehouse_worker", "stock.receive")).toBe(true);
    expect(can("warehouse_worker", "sales.create")).toBe(false);
    expect(can("viewer", "stock.move")).toBe(false);
    expect(can("store_manager", "users.manage")).toBe(false);
    expect(can("admin", "users.manage")).toBe(true);
    expect(can(null, "catalog.manage")).toBe(false);
  });
});
