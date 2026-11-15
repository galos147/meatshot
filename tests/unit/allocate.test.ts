import { describe, expect, it } from "vitest";
import { allocateFefo, stockKey, type StockOption } from "@/features/sales/allocate";

// Already in FEFO order, as public.available_stock returns them.
const rows: StockOption[] = [
  { batch_id: "early", location_id: "f1", qty_kg: 2, packages: 1, is_sellable: true },
  { batch_id: "mid", location_id: "f1", qty_kg: 3, packages: 2, is_sellable: true },
  { batch_id: "late", location_id: "f2", qty_kg: 10, packages: 5, is_sellable: true },
  { batch_id: "expired", location_id: "f1", qty_kg: 50, packages: 9, is_sellable: false },
];

const take = (r: ReturnType<typeof allocateFefo>) => r.allocations.map((a) => [a.row.batch_id, a.qty]);

describe("allocateFefo", () => {
  it("takes from the nearest expiry first and splits across batches", () => {
    const r = allocateFefo(rows, 4.5);
    expect(take(r)).toEqual([["early", 2], ["mid", 2.5]]);
    expect(r.shortfall).toBe(0);
  });

  it("never allocates from unsellable (expired / wrong kosher) rows", () => {
    const r = allocateFefo(rows, 20);
    expect(take(r).map(([b]) => b)).not.toContain("expired");
    expect(r.shortfall).toBe(5);
  });

  it("respects what the cart already reserved", () => {
    const reserved = new Map([[stockKey(rows[0]), 2], [stockKey(rows[1]), 1]]);
    expect(take(allocateFefo(rows, 3, reserved))).toEqual([["mid", 2], ["late", 1]]);
  });

  it("starts from the batch the employee picked, then continues FEFO", () => {
    expect(take(allocateFefo(rows, 11, new Map(), stockKey(rows[2])))).toEqual([["late", 10], ["early", 1]]);
  });

  it("keeps gram precision without floating point drift", () => {
    const r = allocateFefo([{ batch_id: "a", location_id: "x", qty_kg: 0.3, packages: 0, is_sellable: true }, { batch_id: "b", location_id: "x", qty_kg: 1, packages: 0, is_sellable: true }], 0.7);
    expect(take(r)).toEqual([["a", 0.3], ["b", 0.4]]);
  });
});
