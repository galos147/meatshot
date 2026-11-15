import { round3 } from "@/lib/pricing";

export type StockOption = {
  batch_id: string;
  location_id: string;
  qty_kg: number;
  packages: number;
  is_sellable: boolean;
};

export const stockKey = (r: { batch_id: string; location_id: string }) => `${r.batch_id}:${r.location_id}`;

/**
 * Splits a requested weight across stock rows, First-Expired-First-Out.
 * `rows` must already be in FEFO order (as returned by public.available_stock).
 * Starts from `startKey` when the employee picked a specific batch, then continues with
 * the next sellable rows. `reserved` is what the cart already holds per row.
 */
export function allocateFefo(
  rows: StockOption[],
  wantedKg: number,
  reserved: ReadonlyMap<string, number> = new Map(),
  startKey?: string,
): { allocations: { row: StockOption; qty: number }[]; shortfall: number } {
  const sellable = rows.filter((r) => r.is_sellable);
  const start = startKey ? sellable.findIndex((r) => stockKey(r) === startKey) : 0;
  const ordered = start > 0 ? [sellable[start], ...sellable.slice(0, start), ...sellable.slice(start + 1)] : sellable;

  let left = round3(wantedKg);
  const allocations: { row: StockOption; qty: number }[] = [];
  for (const row of ordered) {
    if (left <= 0) break;
    const free = round3(row.qty_kg - (reserved.get(stockKey(row)) ?? 0));
    if (free <= 0) continue;
    const take = round3(Math.min(free, left));
    allocations.push({ row, qty: take });
    left = round3(left - take);
  }
  return { allocations, shortfall: Math.max(0, left) };
}
