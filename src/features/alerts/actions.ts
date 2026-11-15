"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, unwrap } from "@/lib/action";
import { uuid } from "@/lib/validation";

export async function acknowledgeAlerts(ids: string[]) {
  return runAction("alerts.ack", z.object({ ids: z.array(uuid()).min(1).max(500) }), { ids }, async ({ ids }, { supabase, user }) => {
    unwrap(
      await supabase
        .from("alerts")
        .update({ status: "acknowledged", acknowledged_by: user.id, acknowledged_at: new Date().toISOString() })
        .in("id", ids)
        .eq("status", "open")
        .select("id"),
    );
    revalidatePath("/alerts");
    revalidatePath("/dashboard");
    return null;
  });
}

/** Runs the same check the hourly pg_cron job runs. Idempotent. */
export async function refreshAlerts() {
  return runAction("alerts.ack", z.object({}), {}, async (_d, { supabase }) => {
    const created = unwrap(await supabase.rpc("generate_alerts"));
    revalidatePath("/alerts");
    revalidatePath("/dashboard");
    return { created: created as number };
  });
}
