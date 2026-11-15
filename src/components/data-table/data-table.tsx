"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number | null | undefined;
  className?: string;
  headClassName?: string;
  /** Hidden below the md breakpoint to keep phone tables readable. */
  hideOnMobile?: boolean;
  footer?: (rows: T[]) => React.ReactNode;
};

export type Filter<T> = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: (row: T) => string | string[] | null | undefined;
};

type Sort = { id: string; dir: "asc" | "desc" } | null;
const ALL = "__all__";

export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = "חיפוש...",
  filters = [],
  toolbar,
  onRowClick,
  rowClassName,
  defaultSort = null,
  pageSize = 25,
  emptyTitle = "אין עדיין נתונים",
  emptyDescription,
  emptyAction,
  initialFilters = {},
}: {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: Filter<T>[];
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  defaultSort?: Sort;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  initialFilters?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(initialFilters);
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = data.filter((row) => {
      if (q && searchText && !searchText(row).toLowerCase().includes(q)) return false;
      return filters.every((f) => {
        const selected = filterValues[f.id];
        if (!selected || selected === ALL) return true;
        const v = f.value(row);
        return Array.isArray(v) ? v.includes(selected) : v === selected;
      });
    });
    const col = sort && columns.find((c) => c.id === sort.id);
    if (col?.sortValue) {
      const dir = sort!.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const va = col.sortValue!(a);
        const vb = col.sortValue!(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va).localeCompare(String(vb), "he") * dir;
      });
    }
    return out;
  }, [data, query, filterValues, sort, columns, filters, searchText]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize);
  const hasFooter = columns.some((c) => c.footer);
  const filtered = query !== "" || Object.values(filterValues).some((v) => v && v !== ALL);

  const toggleSort = (id: string) =>
    setSort((s) => (s?.id !== id ? { id, dir: "asc" } : s.dir === "asc" ? { id, dir: "desc" } : null));

  return (
    <div className="space-y-3">
      {(searchText || filters.length > 0 || toolbar) && (
        <div className="no-print flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {searchText && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                placeholder={searchPlaceholder}
                className="h-10 bg-card ps-9"
                aria-label="חיפוש"
              />
            </div>
          )}
          {filters.map((f) => (
            <Select
              key={f.id}
              value={filterValues[f.id] ?? ALL}
              onValueChange={(v) => { setFilterValues((s) => ({ ...s, [f.id]: v })); setPage(0); }}
            >
              <SelectTrigger className="h-10! w-full bg-card sm:w-44" aria-label={f.label}>
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{`כל ה${f.label}`}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {filtered && (
            <Button variant="ghost" size="lg" onClick={() => { setQuery(""); setFilterValues({}); setPage(0); }}>
              <X /> ניקוי
            </Button>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2 sm:ms-auto">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.id}
                  className={cn("h-11 text-xs font-semibold text-muted-foreground", c.hideOnMobile && "hidden md:table-cell", c.headClassName)}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.id)}
                      className="inline-flex items-center gap-1 rounded hover:text-foreground"
                    >
                      {c.header}
                      {sort?.id === c.id ? (
                        sort.dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
                      <EmptyTitle>{filtered ? "לא נמצאו תוצאות" : emptyTitle}</EmptyTitle>
                      {(filtered || emptyDescription) && (
                        <EmptyDescription>{filtered ? "נסו לשנות את החיפוש או הסינון" : emptyDescription}</EmptyDescription>
                      )}
                    </EmptyHeader>
                    {!filtered && emptyAction}
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer", rowClassName?.(row))}
                >
                  {columns.map((c) => (
                    <TableCell key={c.id} className={cn("py-3", c.hideOnMobile && "hidden md:table-cell", c.className)}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {hasFooter && rows.length > 0 && (
            <TableFooter>
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.id} className={cn("font-semibold", c.hideOnMobile && "hidden md:table-cell", c.className)}>
                    {c.footer?.(rows)}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <div className="no-print flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {rows.length === data.length ? `${rows.length} רשומות` : `${rows.length} מתוך ${data.length} רשומות`}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="הקודם">
              <ChevronRight />
            </Button>
            <span className="px-2 tabular-nums">{current + 1} / {pageCount}</span>
            <Button variant="outline" size="icon" onClick={() => setPage(current + 1)} disabled={current >= pageCount - 1} aria-label="הבא">
              <ChevronLeft />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
