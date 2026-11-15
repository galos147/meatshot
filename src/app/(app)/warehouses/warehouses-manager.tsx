"use client";

import { EntityManager } from "@/components/crud/entity-manager";
import { ActiveBadge } from "@/components/status";
import { warehouseSchema } from "@/features/catalog/schemas";
import { formatKg } from "@/lib/format";
import type { Tables } from "@/types/database";

type Row = Tables<"warehouses"> & { location_count: number; qty_kg: number };

export function WarehousesManager({ rows }: { rows: Row[] }) {
  return (
    <EntityManager
      entity="warehouses"
      singular="מחסן"
      rows={rows}
      schema={warehouseSchema}
      searchText={(r) => `${r.name} ${r.code ?? ""} ${r.address ?? ""}`}
      columns={[
        { id: "name", header: "שם", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        { id: "code", header: "קוד", cell: (r) => <span className="ltr font-mono text-xs">{r.code ?? "—"}</span> },
        { id: "address", header: "כתובת", hideOnMobile: true, cell: (r) => r.address ?? "—" },
        { id: "locations", header: "מקררים / מיקומים", sortValue: (r) => r.location_count, cell: (r) => <span className="num">{r.location_count}</span> },
        { id: "qty", header: "מלאי", sortValue: (r) => r.qty_kg, cell: (r) => <span className="num">{formatKg(r.qty_kg)}</span> },
        { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "שם המחסן", type: "text", placeholder: "למשל: מחסן ראשי" },
        { name: "code", label: "קוד", type: "text", ltr: true },
        { name: "address", label: "כתובת / תיאור מיקום", type: "text", wide: true },
        { name: "notes", label: "הערות", type: "textarea" },
        { name: "is_active", label: "פעיל", type: "switch" },
      ]}
      emptyValues={{ name: "", code: "", address: "", notes: "", is_active: true }}
      toFormValues={(r) => ({ name: r.name, code: r.code ?? "", address: r.address ?? "", notes: r.notes ?? "", is_active: r.is_active })}
    />
  );
}
