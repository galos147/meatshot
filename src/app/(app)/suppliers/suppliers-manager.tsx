"use client";

import { Mail, Phone } from "lucide-react";
import { EntityManager } from "@/components/crud/entity-manager";
import { ActiveBadge, Pill } from "@/components/status";
import { supplierSchema } from "@/features/catalog/schemas";
import type { Tables } from "@/types/database";

const KIND_LABELS = { supplier: "ספק", factory: "מפעל", both: "ספק ומפעל" } as const;
const kindOptions = Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }));

export function SuppliersManager({ rows }: { rows: Tables<"suppliers">[] }) {
  return (
    <EntityManager
      entity="suppliers"
      singular="ספק"
      rows={rows}
      schema={supplierSchema}
      searchText={(r) => [r.name, r.contact_name, r.phone, r.email, r.business_number].join(" ")}
      searchPlaceholder="חיפוש לפי שם, איש קשר, טלפון..."
      filters={[{ id: "kind", label: "סוגים", options: kindOptions, value: (r) => r.kind }]}
      columns={[
        { id: "name", header: "שם", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        { id: "kind", header: "סוג", cell: (r) => <Pill tone={r.kind === "factory" ? "primary" : "neutral"}>{KIND_LABELS[r.kind]}</Pill> },
        { id: "contact", header: "איש קשר", hideOnMobile: true, cell: (r) => r.contact_name ?? "—" },
        {
          id: "phone",
          header: "טלפון",
          cell: (r) =>
            r.phone ? (
              <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="num inline-flex items-center gap-1.5 hover:text-primary">
                <Phone className="size-3.5 text-muted-foreground" />{r.phone}
              </a>
            ) : "—",
        },
        {
          id: "email",
          header: "אימייל",
          hideOnMobile: true,
          cell: (r) =>
            r.email ? (
              <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 hover:text-primary" dir="ltr">
                <Mail className="size-3.5 text-muted-foreground" />{r.email}
              </a>
            ) : "—",
        },
        { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "שם הספק / המפעל", type: "text" },
        { name: "kind", label: "סוג", type: "select", options: kindOptions },
        { name: "business_number", label: "ח.פ. / עוסק מורשה", type: "text", ltr: true },
        { name: "contact_name", label: "איש קשר", type: "text" },
        { name: "phone", label: "טלפון", type: "tel", ltr: true },
        { name: "email", label: "אימייל", type: "email", ltr: true },
        { name: "address", label: "כתובת", type: "text", wide: true },
        { name: "notes", label: "הערות", type: "textarea" },
        { name: "is_active", label: "פעיל", type: "switch" },
      ]}
      emptyValues={{ name: "", kind: "supplier", business_number: "", contact_name: "", phone: "", email: "", address: "", notes: "", is_active: true }}
      toFormValues={(r) => ({
        name: r.name, kind: r.kind, business_number: r.business_number ?? "", contact_name: r.contact_name ?? "",
        phone: r.phone ?? "", email: r.email ?? "", address: r.address ?? "", notes: r.notes ?? "", is_active: r.is_active,
      })}
    />
  );
}
