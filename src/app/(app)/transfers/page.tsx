import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getLookups } from "@/features/lookups";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { NewTransferButton, TransfersTable } from "./transfers-table";

export const metadata: Metadata = { title: "העברות בין מקררים" };

export default async function TransfersPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: transfers }, { data: stock }, lookups] = await Promise.all([
    supabase
      .from("stock_transfers")
      .select("*, batches(batch_number, products(name)), from:storage_locations!stock_transfers_from_location_id_fkey(name), to:storage_locations!stock_transfers_to_location_id_fkey(name), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(1000),
    can(user.role, "stock.move")
      ? supabase.from("v_stock").select("batch_id, location_id, batch_number, product_name, location_name, qty_kg, packages, expiry_date").order("product_name")
      : Promise.resolve({ data: [] }),
    getLookups(supabase),
  ]);

  const rows = (transfers ?? []).map((t) => ({
    id: t.id,
    transfer_number: t.transfer_number,
    created_at: t.created_at,
    batch_id: t.batch_id,
    batch_number: t.batches?.batch_number ?? "",
    product_name: t.batches?.products?.name ?? "",
    from_name: t.from?.name ?? "",
    to_name: t.to?.name ?? "",
    qty_kg: Number(t.qty_kg),
    packages: t.packages,
    notes: t.notes,
    by: t.profiles?.full_name ?? "",
  }));

  return (
    <>
      <PageHeader
        icon={ArrowLeftRight}
        title="העברות בין מקררים"
        description="העברת כמות מאצווה ממקרר למקרר. ההעברה לא משנה את האצווה – רק את המיקום."
        actions={
          can(user.role, "stock.move") && (
            <NewTransferButton
              stock={(stock ?? []).map((s) => ({
                batch_id: s.batch_id!, location_id: s.location_id!, batch_number: s.batch_number!, product_name: s.product_name!,
                location_name: s.location_name!, qty_kg: Number(s.qty_kg), packages: s.packages ?? 0,
              }))}
              locations={lookups.locations}
            />
          )
        }
      />
      <TransfersTable rows={rows} />
    </>
  );
}
