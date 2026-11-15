"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs, not optimisable */
import { Beef, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { EntityManager } from "@/components/crud/entity-manager";
import { FileUploadButton } from "@/components/file-upload";
import { ActiveBadge, Pill } from "@/components/status";
import { useCan } from "@/components/shell/user-context";
import { setProductImage } from "@/features/catalog/actions";
import { productSchema } from "@/features/catalog/schemas";
import { formatCurrency, formatKg } from "@/lib/format";
import type { Tables } from "@/types/database";

type Row = Omit<Tables<"products">, "cost_price_per_kg"> & {
  /** null when the user may not see cost prices. */
  cost_price_per_kg: number | null;
  image_url: string | null;
  category_name: string | null;
  category_color: string | null;
  qty_kg: number;
  sellable_qty_kg: number;
  packages: number;
  is_low_stock: boolean;
};

export function ProductsManager({ rows, categories }: { rows: Row[]; categories: { value: string; label: string }[] }) {
  const canManage = useCan("catalog.manage");
  const canSeeCost = useCan("reports.financial");

  return (
    <EntityManager
      entity="products"
      singular="מוצר"
      rows={rows}
      schema={productSchema}
      searchText={(r) => [r.name, r.sku, r.barcode, r.category_name, r.description].join(" ")}
      searchPlaceholder='חיפוש לפי שם, מק"ט או ברקוד...'
      filters={[
        { id: "cat", label: "קטגוריות", options: categories, value: (r) => r.category_id },
        {
          id: "stock",
          label: "מצבי מלאי",
          options: [
            { value: "low", label: "מלאי נמוך" },
            { value: "empty", label: "אזל" },
            { value: "ok", label: "תקין" },
          ],
          value: (r) => (r.qty_kg === 0 ? "empty" : r.is_low_stock ? "low" : "ok"),
        },
      ]}
      rowActions={(r) =>
        canManage ? (
          <FileUploadButton
            bucket="product-images"
            folder={r.id}
            accept="image/jpeg,image/png,image/webp"
            label="תמונה"
            variant="ghost"
            onUploaded={async (path) => {
              const res = await setProductImage(r.id, path);
              if (res.ok) toast.success("התמונה עודכנה");
              else toast.error(res.error);
            }}
          />
        ) : null
      }
      columns={[
        {
          id: "name",
          header: "מוצר",
          sortValue: (r) => r.name,
          cell: (r) => (
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-accent ring-1 ring-border">
                {r.image_url ? <img src={r.image_url} alt="" className="size-full object-cover" /> : <Beef className="size-5 text-primary/60" />}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{r.name}</div>
                <div className="ltr text-end font-mono text-xs text-muted-foreground">{r.sku}</div>
              </div>
            </div>
          ),
        },
        {
          id: "category",
          header: "קטגוריה",
          hideOnMobile: true,
          sortValue: (r) => r.category_name,
          cell: (r) =>
            r.category_name ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span className="size-2 rounded-full" style={{ background: r.category_color ?? "var(--primary)" }} />
                {r.category_name}
              </span>
            ) : "—",
        },
        {
          id: "barcode",
          header: "ברקוד",
          hideOnMobile: true,
          cell: (r) => <span className="ltr font-mono text-xs">{r.barcode ?? "—"}</span>,
        },
        {
          id: "price",
          header: 'מחיר לק"ג',
          sortValue: (r) => r.sale_price_per_kg,
          cell: (r) => (
            <div>
              <div className="num font-semibold">{formatCurrency(r.sale_price_per_kg)}</div>
              {canSeeCost && <div className="num text-xs text-muted-foreground">עלות {formatCurrency(r.cost_price_per_kg)}</div>}
            </div>
          ),
        },
        {
          id: "stock",
          header: "מלאי",
          sortValue: (r) => r.qty_kg,
          cell: (r) => (
            <div className="flex flex-col items-start gap-1">
              <span className="num">{formatKg(r.qty_kg)}</span>
              {r.qty_kg === 0 ? (
                <Pill tone="neutral">אזל</Pill>
              ) : r.is_low_stock ? (
                <Pill tone="warning"><TriangleAlert />נמוך (מינ׳ {formatKg(r.min_stock_kg)})</Pill>
              ) : null}
            </div>
          ),
        },
        { id: "status", header: "סטטוס", hideOnMobile: true, cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "שם המוצר", type: "text", placeholder: "למשל: אנטריקוט מיושן" },
        { name: "category_id", label: "קטגוריה", type: "select", options: categories, allowEmpty: true },
        { name: "sku", label: 'מק"ט', type: "text", ltr: true },
        { name: "barcode", label: "ברקוד", type: "text", ltr: true, description: "אפשר לסרוק עם קורא ברקודים" },
        { name: "sale_price_per_kg", label: 'מחיר מכירה לק"ג', type: "number", step: "0.01", suffix: "₪" },
        { name: "cost_price_per_kg", label: 'מחיר עלות לק"ג', type: "number", step: "0.01", suffix: "₪", description: "ברירת מחדל בקבלת סחורה" },
        { name: "min_stock_kg", label: "סף מלאי מינימלי", type: "number", step: "0.001", suffix: 'ק"ג', description: "מתחת לסף תישלח התראת מלאי נמוך. 0 = ללא" },
        { name: "description", label: "תיאור", type: "textarea" },
        { name: "is_active", label: "מוצר פעיל (זמין למכירה ולקבלה)", type: "switch" },
      ]}
      emptyValues={{
        name: "", sku: "", barcode: "", category_id: null, description: "",
        sale_price_per_kg: "" as unknown as number, cost_price_per_kg: "" as unknown as number, min_stock_kg: 0, is_active: true,
      }}
      toFormValues={(r) => ({
        name: r.name, sku: r.sku, barcode: r.barcode ?? "", category_id: r.category_id, description: r.description ?? "",
        sale_price_per_kg: r.sale_price_per_kg, cost_price_per_kg: r.cost_price_per_kg ?? 0, min_stock_kg: r.min_stock_kg, is_active: r.is_active,
      })}
    />
  );
}

