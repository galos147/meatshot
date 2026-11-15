"use client";

import { EntityManager } from "@/components/crud/entity-manager";
import { ActiveBadge } from "@/components/status";
import { categorySchema } from "@/features/catalog/schemas";
import type { Tables } from "@/types/database";

type Row = Tables<"categories"> & { product_count: number };

export function CategoriesManager({ rows }: { rows: Row[] }) {
  return (
    <EntityManager
      entity="categories"
      singular="קטגוריה"
      rows={rows}
      schema={categorySchema}
      searchText={(r) => `${r.name} ${r.description ?? ""}`}
      columns={[
        {
          id: "name",
          header: "שם",
          sortValue: (r) => r.name,
          cell: (r) => (
            <div className="flex items-center gap-2.5">
              <span className="size-3 rounded-full ring-2 ring-background" style={{ background: r.color ?? "var(--primary)" }} />
              <span className="font-medium">{r.name}</span>
            </div>
          ),
        },
        { id: "description", header: "תיאור", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
        { id: "count", header: "מוצרים", sortValue: (r) => r.product_count, cell: (r) => <span className="num">{r.product_count}</span> },
        { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "שם הקטגוריה", type: "text", placeholder: "למשל: בקר טרי" },
        { name: "color", label: "צבע", type: "color" },
        { name: "description", label: "תיאור", type: "textarea" },
        { name: "sort_order", label: "סדר הצגה", type: "number", step: "1" },
        { name: "is_active", label: "פעיל", type: "switch" },
      ]}
      emptyValues={{ name: "", description: "", color: "#8b1e2b", sort_order: 0, is_active: true }}
      toFormValues={(r) => ({ name: r.name, description: r.description ?? "", color: r.color ?? "", sort_order: r.sort_order, is_active: r.is_active })}
    />
  );
}
