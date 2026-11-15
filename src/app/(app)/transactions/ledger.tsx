"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pill } from "@/components/status";
import { reverseTransaction } from "@/features/inventory/actions";
import { TXN_LABELS, TXN_TONES } from "@/features/inventory/labels";
import { formatDateTime, formatKg } from "@/lib/format";
import type { Tables } from "@/types/database";

type Row = Tables<"v_transactions"> & { is_reversed: boolean };
const ALL = "__all__";
const REVERSIBLE = new Set(["receipt", "adjustment", "waste"]);

export function LedgerFilters({ from, to, type, q }: { from: string; to: string; type: string; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="no-print mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <form onSubmit={(e) => { e.preventDefault(); set({ q: text }); }} className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="אצווה או מוצר + Enter" className="h-10 bg-card ps-9" />
      </form>
      <Select value={type || ALL} onValueChange={(v) => set({ type: v === ALL ? "" : v })}>
        <SelectTrigger className="h-10! w-full bg-card sm:w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>כל סוגי התנועות</SelectItem>
          {Object.entries(TXN_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">מ-</span>
        <Input type="date" value={from} onChange={(e) => set({ from: e.target.value })} className="h-10 w-40 bg-card" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">עד</span>
        <Input type="date" value={to} onChange={(e) => set({ to: e.target.value })} className="h-10 w-40 bg-card" />
      </label>
    </div>
  );
}

export function LedgerTable({ rows, total, page, pageSize, canReverse }: { rows: Row[]; total: number; page: number; pageSize: number; canReverse: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const go = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">מועד</TableHead>
              <TableHead className="text-xs">סוג</TableHead>
              <TableHead className="text-xs">מוצר / אצווה</TableHead>
              <TableHead className="hidden text-xs md:table-cell">מיקום</TableHead>
              <TableHead className="text-xs">ק״ג</TableHead>
              <TableHead className="hidden text-xs md:table-cell">אריזות</TableHead>
              <TableHead className="hidden text-xs lg:table-cell">עובד</TableHead>
              <TableHead className="hidden text-xs lg:table-cell">סיבה / הפניה</TableHead>
              {canReverse && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={10} className="py-14 text-center text-muted-foreground">אין תנועות בטווח שנבחר</TableCell></TableRow>
            )}
            {rows.map((t) => {
              const qty = Number(t.qty_kg_delta);
              return (
                <TableRow key={t.id} className={t.is_reversed ? "opacity-55" : undefined}>
                  <TableCell className="num text-xs text-muted-foreground">{t.id}</TableCell>
                  <TableCell className="num text-xs">{formatDateTime(t.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Pill tone={TXN_TONES[t.txn_type!]}>{TXN_LABELS[t.txn_type!]}</Pill>
                      {t.is_reversed && <Pill tone="neutral">בוטלה</Pill>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{t.product_name}</div>
                    <Link href={`/batches/${t.batch_id}`} className="ltr font-mono text-xs text-primary hover:underline">{t.batch_number}</Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{t.location_name}</TableCell>
                  <TableCell className={`num font-semibold ${qty < 0 ? "text-destructive" : qty > 0 ? "text-[oklch(0.45_0.11_155)]" : ""}`}>
                    {qty > 0 ? "+" : ""}{formatKg(qty)}
                  </TableCell>
                  <TableCell className="num hidden md:table-cell">{t.packages_delta ? (t.packages_delta > 0 ? `+${t.packages_delta}` : t.packages_delta) : "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{t.created_by_name}</TableCell>
                  <TableCell className="hidden max-w-56 text-sm text-muted-foreground lg:table-cell">
                    {t.reason ?? ""}
                    {t.reverses_txn_id && <div>מבטלת את #{t.reverses_txn_id}</div>}
                    {t.ref_table === "sale_items" && <div>מכירה</div>}
                  </TableCell>
                  {canReverse && (
                    <TableCell className="text-end">
                      {REVERSIBLE.has(t.txn_type!) && !t.is_reversed && (
                        <ConfirmDialog
                          trigger={<Button variant="ghost" size="sm"><Undo2 />ביטול</Button>}
                          title={`ביטול תנועה #${t.id}`}
                          description={`תיווצר תנועה נגדית של ${formatKg(-qty)}. התנועה המקורית נשארת ביומן.`}
                          requireReason
                          confirmLabel="ביצוע ביטול"
                          destructive
                          successMessage="התנועה בוטלה"
                          onConfirm={(reason) => reverseTransaction(t.id!, reason)}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="no-print flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} תנועות</span>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => go(page - 1)} disabled={page === 0} aria-label="הקודם"><ChevronRight /></Button>
            <span className="px-2 tabular-nums">{page + 1} / {pages}</span>
            <Button variant="outline" size="icon" onClick={() => go(page + 1)} disabled={page >= pages - 1} aria-label="הבא"><ChevronLeft /></Button>
          </div>
        )}
      </div>
    </div>
  );
}
