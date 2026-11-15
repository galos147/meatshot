"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, unwrap } from "@/lib/action";
import { can } from "@/lib/permissions";
import { requiredText, uuid } from "@/lib/validation";
import { adjustmentSchema, batchEditSchema, receiptSchema, transferSchema } from "./schemas";

const STOCK_PATHS = ["/inventory", "/batches", "/dashboard", "/transactions", "/locations", "/alerts"];
const refresh = (...extra: string[]) => [...STOCK_PATHS, ...extra].forEach((p) => revalidatePath(p));

/** Receiving: one atomic DB call creates the receipt, a batch per line, stock and ledger rows. */
export async function receiveGoods(input: unknown) {
  return runAction("stock.receive", receiptSchema, input, async (data, { supabase, user }) => {
    // Staff who cannot see cost prices get no catalogue default in the form. A line they
    // leave without a cost is sent without one, so the database uses the catalogue price.
    const receipt = can(user.role, "reports.financial")
      ? data
      : { ...data, lines: data.lines.map(({ cost_price_per_kg, ...line }) => (cost_price_per_kg > 0 ? { ...line, cost_price_per_kg } : line)) };
    const receiptId = unwrap(await supabase.rpc("receive_goods", { p_receipt: receipt as never }));
    refresh("/receiving");
    return { receiptId: receiptId as string };
  });
}

export async function transferStock(input: unknown) {
  return runAction("stock.move", transferSchema, input, async (d, { supabase }) => {
    const id = unwrap(
      await supabase.rpc("transfer_stock", {
        p_batch_id: d.batch_id,
        p_from_location: d.from_location_id,
        p_to_location: d.to_location_id,
        p_qty_kg: d.qty_kg,
        p_packages: d.packages,
        p_notes: d.notes ?? undefined,
      }),
    );
    refresh("/transfers");
    return { transferId: id as string };
  });
}

export async function adjustStock(input: unknown) {
  return runAction("stock.move", adjustmentSchema, input, async (d, { supabase }) => {
    const sign = d.direction === "remove" ? -1 : 1;
    unwrap(
      await supabase.rpc("adjust_stock", {
        p_batch_id: d.batch_id,
        p_location_id: d.location_id,
        p_qty_delta: sign * d.qty_kg,
        p_packages_delta: sign * d.packages,
        p_kind: d.kind,
        p_reason: d.reason,
      }),
    );
    refresh();
    return null;
  });
}

export async function reverseTransaction(txnId: number, reason: string) {
  return runAction(
    "ledger.reverse",
    z.object({ id: z.number().int().positive(), reason: requiredText("סיבה", 300) }),
    { id: txnId, reason },
    async ({ id, reason }, { supabase }) => {
      unwrap(await supabase.rpc("reverse_transaction", { p_txn_id: id, p_reason: reason }));
      refresh();
      return null;
    },
  );
}

/** Only non-identity fields of a batch are editable (DB trigger enforces this too). */
export async function updateBatch(batchId: string, input: unknown) {
  return runAction("batch.edit", batchEditSchema.extend({ id: uuid() }), { ...(input as object), id: batchId }, async ({ id, ...d }, { supabase }) => {
    unwrap(await supabase.from("batches").update(d).eq("id", id).select("id").single());
    revalidatePath(`/batches/${id}`);
    revalidatePath("/batches");
    return null;
  });
}

export async function addBatchDocument(batchId: string, path: string, fileName: string, docType: string) {
  return runAction(
    "batch.edit",
    z.object({ batch_id: uuid(), file_path: z.string().min(1).max(300), file_name: z.string().min(1).max(200), doc_type: z.string().max(40) }),
    { batch_id: batchId, file_path: path, file_name: fileName, doc_type: docType },
    async (d, { supabase, user }) => {
      unwrap(await supabase.from("batch_documents").insert({ ...d, uploaded_by: user.id }).select("id").single());
      revalidatePath(`/batches/${batchId}`);
      return null;
    },
  );
}

export async function deleteBatchDocument(docId: string) {
  return runAction("batch.edit", z.object({ id: uuid() }), { id: docId }, async ({ id }, { supabase }) => {
    const doc = unwrap(await supabase.from("batch_documents").delete().eq("id", id).select("batch_id, file_path").single());
    await supabase.storage.from("documents").remove([doc.file_path]);
    revalidatePath(`/batches/${doc.batch_id}`);
    return null;
  });
}
