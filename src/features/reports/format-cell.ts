import { formatCurrency, formatDate, formatDateTime, formatInt, formatKgPlain } from "@/lib/format";
import type { ColumnType } from "./registry";

export function formatCell(type: ColumnType, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (type) {
    case "kg":
      return formatKgPlain(value);
    case "money":
      return formatCurrency(value);
    case "int":
      return formatInt(value);
    case "pct":
      return `${(Number(value) * 100).toFixed(1)}%`;
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? formatDate(String(value)) : String(value);
    case "datetime":
      return formatDateTime(String(value));
    default:
      return String(value);
  }
}

export const isNumeric = (t: ColumnType) => t === "kg" || t === "money" || t === "int" || t === "pct";
