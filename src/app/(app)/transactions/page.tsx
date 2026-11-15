import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TXN_LABELS, type TxnType } from "@/features/inventory/labels";
import { requireUser } from "@/lib/auth";
import { isoDaysAgo, storeDayRange, todayIso } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { LedgerFilters, LedgerTable } from "./ledger";

export const metadata: Metadata = { title: "יומן תנועות" };

const PAGE = 100;

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const user = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const from = str("from") || isoDaysAgo(30);
  const to = str("to") || todayIso();
  const type = str("type");
  const q = str("q").trim();
  const page = Math.max(0, Number(str("page")) || 0);

  const [start, end] = storeDayRange(from, to);
  const supabase = await createClient();
  let query = supabase
    .from("v_transactions")
    .select("*", { count: "exact" })
    .gte("created_at", start)
    .lt("created_at", end)
    .order("id", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (type && type in TXN_LABELS) query = query.eq("txn_type", type as TxnType);
  if (q) query = query.or(`batch_number.ilike.%${q.replace(/[%,()]/g, "")}%,product_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data, count } = await query;

  const ids = (data ?? []).map((t) => t.id!);
  const { data: reversals } = ids.length
    ? await supabase.from("inventory_transactions").select("reverses_txn_id").in("reverses_txn_id", ids)
    : { data: [] };
  const reversed = new Set((reversals ?? []).map((r) => r.reverses_txn_id));

  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="יומן תנועות מלאי"
        description="תיעוד מלא ובלתי ניתן לשינוי של כל שינוי במלאי. תיקון נעשה רק באמצעות תנועת ביטול מתועדת."
      />
      <LedgerFilters from={from} to={to} type={type} q={q} />
      <LedgerTable
        rows={(data ?? []).map((t) => ({ ...t, is_reversed: reversed.has(t.id!) }))}
        total={count ?? 0}
        page={page}
        pageSize={PAGE}
        canReverse={can(user.role, "ledger.reverse")}
      />
    </>
  );
}

