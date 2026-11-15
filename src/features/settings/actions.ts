"use server";

import { revalidatePath } from "next/cache";
import { runAction, unwrap } from "@/lib/action";
import { settingsSchema } from "./schemas";

export async function saveSettings(input: unknown) {
  return runAction("settings.manage", settingsSchema, input, async (d, { supabase }) => {
    unwrap(
      await supabase
        .from("app_settings")
        .update({ store_name: d.store_name, expiry_alert_days: d.expiry_alert_days, default_min_stock_kg: d.default_min_stock_kg })
        .eq("id", 1)
        .select("id")
        .single(),
    );
    revalidatePath("/", "layout");
    return null;
  });
}
