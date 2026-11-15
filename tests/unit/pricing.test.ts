import { describe, expect, it } from "vitest";
import { cartTotals, lineAmounts, percentToAmount } from "@/lib/pricing";

describe("lineAmounts", () => {
  it("prices weight × price per kg, rounded to agorot", () => {
    expect(lineAmounts({ qtyKg: 1.234, pricePerKg: 189.9, discount: 0 })).toEqual({ gross: 234.34, discount: 0, total: 234.34 });
  });

  it("rounds the weight to grams before pricing (matches the database)", () => {
    expect(lineAmounts({ qtyKg: 1.2345, pricePerKg: 100, discount: 0 }).gross).toBe(123.5);
  });

  it("clamps the discount between 0 and the gross amount", () => {
    expect(lineAmounts({ qtyKg: 1, pricePerKg: 50, discount: 80 }).total).toBe(0);
    expect(lineAmounts({ qtyKg: 1, pricePerKg: 50, discount: -5 }).discount).toBe(0);
  });
});

describe("percentToAmount", () => {
  it("converts and caps at 100%", () => {
    expect(percentToAmount(200, 10)).toBe(20);
    expect(percentToAmount(200, 150)).toBe(200);
    expect(percentToAmount(99.99, 33)).toBe(33);
  });
});

describe("cartTotals", () => {
  it("sums lines and applies the sale discount after line discounts", () => {
    const t = cartTotals(
      [
        { qtyKg: 2.5, pricePerKg: 120, discount: 10 },
        { qtyKg: 1, pricePerKg: 44.9, discount: 0 },
      ],
      20,
    );
    expect(t).toMatchObject({ subtotal: 344.9, itemsDiscount: 10, saleDiscount: 20, total: 314.9 });
  });

  it("never lets the sale discount make the total negative", () => {
    expect(cartTotals([{ qtyKg: 1, pricePerKg: 10, discount: 0 }], 50).total).toBe(0);
  });

  it("handles an empty cart", () => {
    expect(cartTotals([]).total).toBe(0);
  });
});
