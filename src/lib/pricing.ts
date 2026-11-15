/** Sale arithmetic. Mirrors public.create_sale so the cart shows exactly what will be charged. */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export type CartLineInput = { qtyKg: number; pricePerKg: number; discount: number };

export function lineAmounts({ qtyKg, pricePerKg, discount }: CartLineInput) {
  const gross = round2(round3(qtyKg) * pricePerKg);
  const disc = Math.min(Math.max(round2(discount), 0), gross);
  return { gross, discount: disc, total: round2(gross - disc) };
}

/** Converts a percentage discount into an amount on a gross line. */
export const percentToAmount = (gross: number, percent: number) => round2((gross * Math.min(Math.max(percent, 0), 100)) / 100);

export function cartTotals(lines: CartLineInput[], saleDiscount = 0) {
  const amounts = lines.map(lineAmounts);
  const subtotal = round2(amounts.reduce((s, a) => s + a.gross, 0));
  const itemsDiscount = round2(amounts.reduce((s, a) => s + a.discount, 0));
  const afterItems = round2(subtotal - itemsDiscount);
  const extra = Math.min(Math.max(round2(saleDiscount), 0), afterItems);
  return { subtotal, itemsDiscount, saleDiscount: extra, total: round2(afterItems - extra), lines: amounts };
}
