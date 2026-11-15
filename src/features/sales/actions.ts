"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, unwrap } from "@/lib/action";
import { requiredText, uuid } from "@/lib/validation";
import { returnSchema, saleSchema } from "./schemas";

const refresh = (saleId?: string) => {
  ["/sales", "/dashboard", "/inventory", "/batches", "/transactions", "/sales/new"].forEach((p) => revalidatePath(p));
  if (saleId) revalidatePath(`/sales/${saleId}`);
};

/**
 * Records a sale. Stock deduction, FEFO / kosher / expiry checks and the ledger rows all
 * happen inside public.create_sale in ONE transaction. The idempotency key makes a
 * double-click or a network retry record the sale only once.
 */
export async function createSale(input: unknown) {
  return runAction("sales.create", saleSchema, input, async (d, { supabase }) => {
    const saleId = unwrap(
      await supabase.rpc("create_sale", {
        p_idempotency_key: d.idempotency_key,
        p_items: d.items as never,
        p_kosher_body_ids: d.kosher_body_ids,
        p_sale_discount: d.sale_discount,
        p_customer_name: d.customer_name ?? undefined,
        p_notes: d.notes ?? undefined,
      }),
    ) as string;
    const sale = unwrap(await supabase.from("sales").select("id, sale_number, total, created_at").eq("id", saleId).single());
    refresh();
    return sale;
  });
}

export async function cancelSale(saleId: string, reason: string) {
  return runAction("sales.cancel", z.object({ id: uuid(), reason: requiredText("סיבה", 300) }), { id: saleId, reason }, async ({ id, reason }, { supabase }) => {
    unwrap(await supabase.rpc("cancel_sale", { p_sale_id: id, p_reason: reason }));
    refresh(id);
    return null;
  });
}

export async function returnSaleItems(input: unknown) {
  return runAction("sales.cancel", returnSchema, input, async (d, { supabase }) => {
    const id = unwrap(
      await supabase.rpc("return_sale_items", { p_sale_id: d.sale_id, p_items: d.items as never, p_reason: d.reason }),
    );
    refresh(d.sale_id);
    return { returnId: id as string };
  });
}
