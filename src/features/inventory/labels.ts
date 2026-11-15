import type { Database } from "@/types/database";

export type TxnType = Database["public"]["Enums"]["txn_type"];

export const TXN_LABELS: Record<TxnType, string> = {
  receipt: "קבלת סחורה",
  sale: "מכירה",
  sale_cancel: "ביטול מכירה",
  sale_return: "החזרה",
  transfer_out: "העברה – יציאה",
  transfer_in: "העברה – כניסה",
  adjustment: "התאמת מלאי",
  waste: "השמדה / פחת",
  reversal: "ביטול תנועה",
};

export const TXN_TONES: Record<TxnType, "success" | "primary" | "info" | "warning" | "danger" | "neutral"> = {
  receipt: "success",
  sale: "primary",
  sale_cancel: "warning",
  sale_return: "warning",
  transfer_out: "info",
  transfer_in: "info",
  adjustment: "neutral",
  waste: "danger",
  reversal: "warning",
};

export const BLOCK_REASON_LABELS: Record<string, string> = {
  expired: "פג תוקף",
  cert_invalid: "תעודת הכשר לא בתוקף",
  product_inactive: "מוצר לא פעיל",
  kosher_mismatch: "הכשר לא תואם",
};
