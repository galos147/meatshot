"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DefaultValues, FieldValues } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, type Column, type Filter } from "@/components/data-table/data-table";
import { useCan } from "@/components/shell/user-context";
import { deleteEntity, saveEntity, setEntityActive, type EntityName } from "@/features/catalog/actions";
import { EntityDialog, type FieldDef } from "./entity-dialog";

type Row = { id: string; is_active?: boolean };

export function EntityManager<T extends Row, S extends z.ZodType<FieldValues, FieldValues>>({
  entity,
  rows,
  columns,
  fields,
  schema,
  emptyValues,
  toFormValues,
  singular,
  searchText,
  searchPlaceholder,
  filters,
  extraActions,
  rowActions,
  onRowClick,
  emptyDescription,
}: {
  entity: EntityName;
  rows: T[];
  columns: Column<T>[];
  fields: FieldDef[];
  schema: S;
  emptyValues: DefaultValues<z.input<S>>;
  toFormValues: (row: T) => DefaultValues<z.input<S>>;
  /** e.g. "קטגוריה" → "הוספת קטגוריה" / "עריכת קטגוריה" */
  singular: string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: Filter<T>[];
  extraActions?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyDescription?: string;
}) {
  const canManage = useCan("catalog.manage");
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: T) => { setEditing(row); setOpen(true); };

  const actionsColumn: Column<T> = {
    id: "__actions",
    header: "",
    headClassName: "w-12",
    className: "w-12 text-end",
    cell: (row) => (
      <div onClick={(e) => e.stopPropagation()} className="flex justify-end gap-1">
        {rowActions?.(row)}
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="פעולות"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => openEdit(row)}><Pencil />עריכה</DropdownMenuItem>
              {"is_active" in row && (
                <DropdownMenuItem
                  onSelect={async () => {
                    const res = await setEntityActive(entity, row.id, !row.is_active);
                    if (res.ok) toast.success(row.is_active ? "סומן כלא פעיל" : "הופעל מחדש");
                    else toast.error(res.error);
                  }}
                >
                  <Power />{row.is_active ? "סימון כלא פעיל" : "הפעלה מחדש"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <ConfirmDialog
                trigger={
                  <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                    <Trash2 />מחיקה
                  </DropdownMenuItem>
                }
                title={`למחוק את ה${singular}?`}
                description="אפשר למחוק רק רשומה שאינה בשימוש. רשומה שבשימוש – סמנו כלא פעילה."
                confirmLabel="מחיקה"
                destructive
                successMessage="נמחק"
                onConfirm={() => deleteEntity(entity, row.id)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    ),
  };

  const addButton = canManage ? (
    <Button size="lg" onClick={openNew} className="shadow-sm shadow-primary/25">
      <Plus />הוספת {singular}
    </Button>
  ) : null;

  return (
    <>
      <DataTable
        data={rows}
        columns={[...columns, actionsColumn]}
        getRowId={(r) => r.id}
        searchText={searchText}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        onRowClick={onRowClick ?? (canManage ? openEdit : undefined)}
        rowClassName={(r) => (r.is_active === false ? "opacity-55" : undefined)}
        toolbar={<>{extraActions}{addButton}</>}
        emptyTitle={`אין עדיין ${singular === "מוצר" ? "מוצרים" : "רשומות"}`}
        emptyDescription={emptyDescription ?? (canManage ? `לחצו על "הוספת ${singular}" כדי להתחיל` : undefined)}
        emptyAction={addButton}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `עריכת ${singular}` : `הוספת ${singular}`}
        schema={schema}
        fields={fields}
        defaultValues={editing ? toFormValues(editing) : emptyValues}
        onSubmit={(values) => saveEntity(entity, editing?.id ?? null, values)}
        successMessage={editing ? "השינויים נשמרו" : "נשמר בהצלחה"}
      />
    </>
  );
}
