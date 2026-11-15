"use client";

import { useState } from "react";
import { KeyRound, MoreHorizontal, Pencil, Power, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EntityDialog } from "@/components/crud/entity-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { ActiveBadge, Pill } from "@/components/status";
import { createEmployee, resetEmployeePassword, setEmployeeActive, updateEmployee } from "@/features/users/actions";
import { createUserSchema, editUserSchema as editSchema, passwordSchema } from "@/features/users/schemas";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions";
import type { Tables } from "@/types/database";

type Row = Tables<"profiles">;
const roleOptions = (Object.keys(ROLE_LABELS) as AppRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

type AnySchema = z.ZodType<Record<string, unknown>, Record<string, unknown>>;

export function UsersManager({ rows, meId }: { rows: Row[]; meId: string }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [resetting, setResetting] = useState<Row | null>(null);

  return (
    <>
      <DataTable
        data={rows}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.full_name} ${r.email ?? ""} ${r.phone ?? ""}`}
        searchPlaceholder="חיפוש עובד..."
        filters={[{ id: "role", label: "תפקידים", options: roleOptions, value: (r) => r.role }]}
        rowClassName={(r) => (!r.is_active ? "opacity-55" : undefined)}
        toolbar={<Button size="lg" onClick={() => setCreating(true)} className="shadow-sm shadow-primary/25"><UserPlus />עובד חדש</Button>}
        columns={[
          {
            id: "name",
            header: "עובד",
            sortValue: (r) => r.full_name,
            cell: (r) => (
              <div className="flex items-center gap-3">
                <Avatar className="size-9"><AvatarFallback className="bg-primary/10 font-semibold text-primary">{r.full_name.slice(0, 2)}</AvatarFallback></Avatar>
                <div>
                  <div className="font-medium">{r.full_name} {r.id === meId && <span className="text-xs text-muted-foreground">(את/ה)</span>}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">{r.email}</div>
                </div>
              </div>
            ),
          },
          { id: "role", header: "תפקיד", sortValue: (r) => r.role, cell: (r) => <Pill tone={r.role === "admin" ? "primary" : "neutral"}>{ROLE_LABELS[r.role]}</Pill> },
          { id: "phone", header: "טלפון", hideOnMobile: true, cell: (r) => <span className="ltr">{r.phone ?? "—"}</span> },
          { id: "since", header: "נוצר", hideOnMobile: true, cell: (r) => <span className="num">{formatDate(r.created_at)}</span> },
          { id: "status", header: "סטטוס", cell: (r) => <ActiveBadge active={r.is_active} /> },
          {
            id: "actions",
            header: "",
            className: "text-end",
            cell: (r) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="פעולות"><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing(r)}><Pencil />עריכה ותפקיד</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setResetting(r)}><KeyRound />איפוס סיסמה</DropdownMenuItem>
                  {r.id !== meId && (
                    <DropdownMenuItem
                      variant={r.is_active ? "destructive" : "default"}
                      onSelect={async () => {
                        const res = await setEmployeeActive(r.id, !r.is_active);
                        if (res.ok) toast.success(r.is_active ? "המשתמש הושבת" : "המשתמש הופעל");
                        else toast.error(res.error);
                      }}
                    >
                      <Power />{r.is_active ? "השבתת משתמש" : "הפעלה מחדש"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      <EntityDialog
        open={creating}
        onOpenChange={setCreating}
        title="עובד חדש"
        description="העובד יתחבר עם האימייל והסיסמה שתגדירו. מסרו לו את הסיסמה באופן אישי."
        schema={createUserSchema as unknown as AnySchema}
        fields={[
          { name: "full_name", label: "שם מלא", type: "text" },
          { name: "role", label: "תפקיד", type: "select", options: roleOptions },
          { name: "email", label: "אימייל (שם משתמש)", type: "email", ltr: true },
          { name: "phone", label: "טלפון", type: "tel", ltr: true },
          { name: "password", label: "סיסמה ראשונית", type: "text", ltr: true, description: "לפחות 8 תווים", wide: true },
        ]}
        defaultValues={{ full_name: "", role: "sales_employee", email: "", phone: "", password: "" }}
        onSubmit={createEmployee}
        submitLabel="יצירת משתמש"
        successMessage="המשתמש נוצר"
      />

      <EntityDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`עריכת ${editing?.full_name ?? ""}`}
        schema={editSchema as unknown as AnySchema}
        fields={[
          { name: "full_name", label: "שם מלא", type: "text" },
          { name: "role", label: "תפקיד", type: "select", options: roleOptions },
          { name: "phone", label: "טלפון", type: "tel", ltr: true },
        ]}
        defaultValues={{ full_name: editing?.full_name ?? "", role: editing?.role ?? "viewer", phone: editing?.phone ?? "" }}
        onSubmit={(v) => updateEmployee({ ...v, id: editing!.id })}
      />

      <EntityDialog
        open={!!resetting}
        onOpenChange={(o) => !o && setResetting(null)}
        title={`איפוס סיסמה – ${resetting?.full_name ?? ""}`}
        schema={passwordSchema as unknown as AnySchema}
        fields={[{ name: "password", label: "סיסמה חדשה", type: "text", ltr: true, wide: true, description: "לפחות 8 תווים" }]}
        defaultValues={{ password: "" }}
        onSubmit={(v) => resetEmployeePassword(resetting!.id, String(v.password))}
        submitLabel="עדכון סיסמה"
        successMessage="הסיסמה עודכנה"
      />
    </>
  );
}
