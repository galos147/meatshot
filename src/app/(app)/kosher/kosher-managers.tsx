"use client";

import { toast } from "sonner";
import { EntityManager } from "@/components/crud/entity-manager";
import { FileUploadButton, OpenFileButton } from "@/components/file-upload";
import { ActiveBadge, ExpiryBadge, Pill } from "@/components/status";
import { useCan } from "@/components/shell/user-context";
import { setCertificateDocument } from "@/features/catalog/actions";
import { certificateSchema, kosherBodySchema, kosherLevelSchema } from "@/features/catalog/schemas";
import { formatDate, formatKg } from "@/lib/format";
import type { Tables } from "@/types/database";

type Option = { value: string; label: string };

export function KosherBodiesManager({
  rows,
  levels,
}: {
  rows: (Tables<"kosher_bodies"> & { level_name: string | null; qty_kg: number })[];
  levels: Option[];
}) {
  return (
    <EntityManager
      entity="kosher_bodies"
      singular="גוף הכשר"
      rows={rows}
      schema={kosherBodySchema}
      searchText={(r) => `${r.name} ${r.level_name ?? ""} ${r.contact ?? ""}`}
      filters={levels.length ? [{ id: "level", label: "רמות", options: levels, value: (r) => r.level_id }] : []}
      emptyDescription='למשל: בד"ץ העדה החרדית, רבנות מהדרין, בד"ץ בית יוסף. לחצו על "הוספת גוף הכשר".'
      columns={[
        { id: "name", header: "גוף ההכשר", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        { id: "level", header: "רמה", cell: (r) => (r.level_name ? <Pill tone="primary">{r.level_name}</Pill> : "—") },
        { id: "contact", header: "איש קשר", hideOnMobile: true, cell: (r) => r.contact ?? "—" },
        { id: "stock", header: "במלאי", sortValue: (r) => r.qty_kg, cell: (r) => <span className="num">{formatKg(r.qty_kg)}</span> },
        { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "שם גוף ההכשר", type: "text" },
        { name: "level_id", label: "רמת כשרות", type: "select", options: levels, allowEmpty: true, description: "אופציונלי. את הרמות מגדירים בלשונית 'רמות כשרות'" },
        { name: "contact", label: "איש קשר / טלפון", type: "text", wide: true },
        { name: "notes", label: "הערות", type: "textarea" },
        { name: "is_active", label: "פעיל", type: "switch" },
      ]}
      emptyValues={{ name: "", level_id: null, contact: "", notes: "", is_active: true }}
      toFormValues={(r) => ({ name: r.name, level_id: r.level_id, contact: r.contact ?? "", notes: r.notes ?? "", is_active: r.is_active })}
    />
  );
}

export function CertificatesManager({
  rows,
  bodies,
  suppliers,
}: {
  rows: (Tables<"kosher_certificates"> & { body_name: string; supplier_name: string | null; days_left: number })[];
  bodies: Option[];
  suppliers: Option[];
}) {
  const canManage = useCan("catalog.manage");
  return (
    <EntityManager
      entity="kosher_certificates"
      singular="תעודת הכשר"
      rows={rows}
      schema={certificateSchema}
      searchText={(r) => `${r.certificate_number} ${r.body_name} ${r.supplier_name ?? ""}`}
      filters={[{ id: "body", label: "גופי הכשר", options: bodies, value: (r) => r.kosher_body_id }]}
      emptyDescription={bodies.length === 0 ? "קודם הוסיפו גוף הכשר" : undefined}
      rowActions={(r) => (
        <div className="flex items-center gap-1">
          {r.document_path && <OpenFileButton bucket="documents" path={r.document_path} label="תעודה" />}
          {canManage && (
            <FileUploadButton
              bucket="documents"
              folder={`certificates/${r.id}`}
              accept="application/pdf,image/*"
              label={r.document_path ? "החלפה" : "העלאה"}
              variant="ghost"
              onUploaded={async (path) => {
                const res = await setCertificateDocument(r.id, path);
                if (res.ok) toast.success("התעודה הועלתה");
                else toast.error(res.error);
              }}
            />
          )}
        </div>
      )}
      columns={[
        {
          id: "number",
          header: "מספר תעודה",
          sortValue: (r) => r.certificate_number,
          cell: (r) => <span className="num font-medium">{r.certificate_number}</span>,
        },
        { id: "body", header: "גוף הכשר", sortValue: (r) => r.body_name, cell: (r) => r.body_name },
        { id: "supplier", header: "ספק", hideOnMobile: true, cell: (r) => r.supplier_name ?? "—" },
        { id: "from", header: "בתוקף מ-", hideOnMobile: true, cell: (r) => <span className="num">{formatDate(r.valid_from)}</span> },
        {
          id: "until",
          header: "תוקף עד",
          sortValue: (r) => r.valid_until,
          cell: (r) => <ExpiryBadge date={r.valid_until} days={r.days_left} />,
        },
        { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "kosher_body_id", label: "גוף הכשר", type: "select", options: bodies },
        { name: "certificate_number", label: "מספר תעודה", type: "text", ltr: true },
        { name: "supplier_id", label: "ספק / מפעל", type: "combobox", options: suppliers, allowEmpty: true },
        { name: "valid_from", label: "בתוקף מתאריך", type: "date" },
        { name: "valid_until", label: "בתוקף עד", type: "date" },
        { name: "notes", label: "הערות", type: "textarea" },
        { name: "is_active", label: "פעיל", type: "switch" },
      ]}
      emptyValues={{ kosher_body_id: bodies[0]?.value ?? "", certificate_number: "", supplier_id: null, valid_from: "", valid_until: "", notes: "", is_active: true }}
      toFormValues={(r) => ({
        kosher_body_id: r.kosher_body_id, certificate_number: r.certificate_number, supplier_id: r.supplier_id,
        valid_from: r.valid_from ?? "", valid_until: r.valid_until, notes: r.notes ?? "", is_active: r.is_active,
      })}
    />
  );
}

export function KosherLevelsManager({ rows }: { rows: Tables<"kosher_levels">[] }) {
  return (
    <EntityManager
      entity="kosher_levels"
      singular="רמת כשרות"
      rows={rows}
      schema={kosherLevelSchema}
      searchText={(r) => r.name}
      emptyDescription="אופציונלי – למשל: רגיל, מהדרין, בד״ץ. דירוג גבוה יותר = רמה מחמירה יותר."
      columns={[
        { id: "name", header: "שם", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
        { id: "rank", header: "דירוג", sortValue: (r) => r.rank, cell: (r) => <span className="num">{r.rank}</span> },
        { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
      ]}
      fields={[
        { name: "name", label: "שם הרמה", type: "text" },
        { name: "rank", label: "דירוג (גבוה = מחמיר)", type: "number", step: "1" },
        { name: "is_active", label: "פעיל", type: "switch" },
      ]}
      emptyValues={{ name: "", rank: 0, is_active: true }}
      toFormValues={(r) => ({ name: r.name, rank: r.rank, is_active: r.is_active })}
    />
  );
}
