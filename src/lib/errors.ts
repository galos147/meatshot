type DbError = { code?: string; message?: string; details?: string; hint?: string } | null | undefined;

/** Turns a Supabase / Postgres error into a message an employee can act on. */
export function toHebrewError(error: unknown): string {
  const e = error as DbError;
  if (!e) return "אירעה שגיאה לא צפויה";
  switch (e.code) {
    case "P0001": // raised by our own functions/triggers, already in Hebrew
      return e.message ?? "הפעולה נדחתה";
    case "23505":
      return uniqueMessage(e.details ?? e.message ?? "");
    case "23503":
      return e.message?.includes("delete")
        ? "לא ניתן למחוק: הרשומה בשימוש. אפשר לסמן אותה כלא פעילה."
        : "הרשומה המקושרת לא נמצאה";
    case "23514":
      return "אחד הערכים אינו תקין (למשל כמות שלילית)";
    case "42501":
      return "אין לך הרשאה לבצע פעולה זו";
    case "PGRST116":
      return "הרשומה לא נמצאה";
    case "22P02":
      return "ערך לא תקין";
  }
  if (e.message?.includes("row-level security")) return "אין לך הרשאה לבצע פעולה זו";
  if (e.message?.toLowerCase().includes("fetch")) return "אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.";
  if (e.message?.includes("Invalid login credentials")) return "אימייל או סיסמה שגויים";
  return e.message || "אירעה שגיאה לא צפויה";
}

function uniqueMessage(detail: string): string {
  if (detail.includes("sku")) return "מק\"ט זה כבר קיים";
  if (detail.includes("barcode")) return "ברקוד זה כבר קיים";
  if (detail.includes("code")) return "קוד זה כבר קיים";
  if (detail.includes("certificate_number")) return "מספר תעודה זה כבר קיים לגוף ההכשר";
  if (detail.includes("name")) return "שם זה כבר קיים";
  if (detail.includes("email")) return "אימייל זה כבר רשום";
  return "ערך זה כבר קיים";
}
