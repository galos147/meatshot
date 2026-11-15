const currency = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2 });
const kg = new Intl.NumberFormat("he-IL", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const int = new Intl.NumberFormat("he-IL");
const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" });
const dateTimeFmt = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem",
});

const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? 0 : Number(v));

export const formatCurrency = (v: number | string | null | undefined) => currency.format(num(v));
export const formatKg = (v: number | string | null | undefined) => `${kg.format(num(v))} ק"ג`;
export const formatKgPlain = (v: number | string | null | undefined) => kg.format(num(v));
export const formatInt = (v: number | string | null | undefined) => int.format(num(v));

/** Storage temperature range label. Lives here (not in a client file) because server pages call it too. */
export function tempRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${min}° עד ${max}°`;
  return min !== null ? `מעל ${min}°` : `עד ${max}°`;
}

/** Dates from Postgres `date` columns arrive as YYYY-MM-DD: format without timezone shifts. */
export function formatDate(v: string | Date | null | undefined): string {
  if (!v) return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateFmt.format(new Date(v));
}

export const formatDateTime = (v: string | Date | null | undefined) => (v ? dateTimeFmt.format(new Date(v)) : "—");

/** Today's date in the store's timezone as YYYY-MM-DD. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

export function daysLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return "—";
  if (days < 0) return `פג לפני ${Math.abs(days)} ימים`;
  if (days === 0) return "פג היום";
  if (days === 1) return "מחר";
  return `בעוד ${days} ימים`;
}

/** UTC instant of local midnight (Asia/Jerusalem) starting the given YYYY-MM-DD day. */
export function storeDayStart(dateIso: string): string {
  // Probe just before local midnight so the offset is the one in force at 00:00.
  const probe = new Date(Date.parse(`${dateIso}T00:00:00Z`) - 3 * 3_600_000);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "longOffset" })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = tz?.match(/GMT([+-]\d{2}):?(\d{2})?/);
  const offset = m ? `${m[1]}:${m[2] ?? "00"}` : "+02:00";
  return new Date(`${dateIso}T00:00:00${offset}`).toISOString();
}

/** [start, endExclusive) UTC bounds covering whole store days from..to inclusive. */
export function storeDayRange(from: string, to: string): [string, string] {
  const next = new Date(Date.parse(`${to}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return [storeDayStart(from), storeDayStart(next)];
}

export function isoDaysAgo(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(Date.now() - days * 86_400_000));
}
