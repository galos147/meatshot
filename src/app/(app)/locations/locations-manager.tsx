"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityManager } from "@/components/crud/entity-manager";
import { ActiveBadge, Pill } from "@/components/status";
import { locationSchema, locationTypeSchema } from "@/features/catalog/schemas";
import { formatKg, tempRange } from "@/lib/format";
import type { Tables } from "@/types/database";

type Option = { value: string; label: string };
type Row = Tables<"storage_locations"> & { warehouse_name: string; type_name: string | null; qty_kg: number; batch_count: number };


export function LocationsManager({ rows, warehouses, types }: { rows: Row[]; warehouses: Option[]; types: Option[] }) {
  const router = useRouter();
  return (
    <EntityManager
      entity="storage_locations"
      singular="מיקום"
      rows={rows}
      schema={locationSchema}
      searchText={(r) => [r.name, r.code, r.zone, r.shelf, r.warehouse_name, r.type_name].join(" ")}
      searchPlaceholder="חיפוש לפי שם, מספר, אזור..."
      filters={[
        { id: "wh", label: "מחסנים", options: warehouses, value: (r) => r.warehouse_id },
        { id: "type", label: "סוגים", options: types, value: (r) => r.location_type_id },
      ]}
      onRowClick={(r) => router.push(`/locations/${r.id}`)}
      rowActions={(r) => (
        <Button asChild variant="ghost" size="icon" aria-label="צפייה במלאי">
          <Link href={`/locations/${r.id}`}><Eye /></Link>
        </Button>
      )}
      emptyDescription={warehouses.length === 0 ? "קודם הוסיפו מחסן במסך המחסנים" : undefined}
      columns={[
        {
          id: "name",
          header: "מיקום",
          sortValue: (r) => r.code,
          cell: (r) => (
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="ltr text-end font-mono text-xs text-muted-foreground">{r.code}</div>
            </div>
          ),
        },
        { id: "type", header: "סוג", cell: (r) => (r.type_name ? <Pill tone="info">{r.type_name}</Pill> : "—") },
        { id: "warehouse", header: "מחסן", hideOnMobile: true, sortValue: (r) => r.warehouse_name, cell: (r) => r.warehouse_name },
        {
          id: "zone",
          header: "אזור / מדף",
          hideOnMobile: true,
          cell: (r) => [r.zone, r.shelf].filter(Boolean).join(" · ") || "—",
        },
        {
          id: "temp",
          header: "טמפרטורה",
          hideOnMobile: true,
          cell: (r) => {
            const t = tempRange(r.temp_min, r.temp_max);
            return t ? (
              <span className="num inline-flex items-center gap-1 text-sm"><Thermometer className="size-3.5 text-info" />{t}</span>
            ) : "—";
          },
        },
        {
          id: "stock",
          header: "מלאי",
          sortValue: (r) => r.qty_kg,
          cell: (r) => (
            <div>
              <div className="num">{formatKg(r.qty_kg)}</div>
              <div className="text-xs text-muted-foreground">{r.batch_count} אצוות</div>
            </div>
          ),
        },
        { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "שם", type: "text", placeholder: "למשל: מקרר בשר טרי" },
        { name: "code", label: "מספר / קוד", type: "text", ltr: true, placeholder: "F-01" },
        { name: "warehouse_id", label: "מחסן", type: "select", options: warehouses },
        { name: "location_type_id", label: "סוג מיקום", type: "select", options: types, allowEmpty: true, description: "את הסוגים מגדירים בלשונית 'סוגי מיקום'" },
        { name: "zone", label: "אזור", type: "text" },
        { name: "shelf", label: "מדף", type: "text" },
        { name: "temp_min", label: "טמפרטורה מינימלית", type: "number", step: "0.1", suffix: "°C" },
        { name: "temp_max", label: "טמפרטורה מקסימלית", type: "number", step: "0.1", suffix: "°C" },
        { name: "notes", label: "הערות", type: "textarea" },
        { name: "is_active", label: "פעיל", type: "switch" },
      ]}
      emptyValues={{
        name: "", code: "", warehouse_id: warehouses[0]?.value ?? "", location_type_id: null, zone: "", shelf: "",
        temp_min: "", temp_max: "", notes: "", is_active: true,
      }}
      toFormValues={(r) => ({
        name: r.name, code: r.code, warehouse_id: r.warehouse_id, location_type_id: r.location_type_id, zone: r.zone ?? "",
        shelf: r.shelf ?? "", temp_min: r.temp_min ?? "", temp_max: r.temp_max ?? "", notes: r.notes ?? "", is_active: r.is_active,
      })}
    />
  );
}

export function LocationTypesManager({ rows }: { rows: Tables<"location_types">[] }) {
  return (
    <EntityManager
      entity="location_types"
      singular="סוג מיקום"
      rows={rows}
      schema={locationTypeSchema}
      searchText={(r) => r.name}
      emptyDescription='למשל: מקרר, מקפיא, חדר קירור, מדף תצוגה. לחצו על "הוספת סוג מיקום".'
      columns={[
        { id: "name", header: "שם", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "שם הסוג", type: "text", placeholder: "מקרר / מקפיא / חדר קירור" },
        { name: "is_active", label: "פעיל", type: "switch" },
      ]}
      emptyValues={{ name: "", is_active: true }}
      toFormValues={(r) => ({ name: r.name, is_active: r.is_active })}
    />
  );
}
