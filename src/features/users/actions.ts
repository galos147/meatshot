"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, unwrap } from "@/lib/action";
import { createAdminClient } from "@/lib/supabase/admin";
import { requiredText, uuid } from "@/lib/validation";
import { createUserSchema, password, ROLES } from "./schemas";

/** Admin only. Uses the service key server-side; the role goes into app_metadata (not user-editable). */
export async function createEmployee(input: unknown) {
  return runAction("users.manage", createUserSchema, input, async (d, { supabase }) => {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      app_metadata: { role: d.role },
      user_metadata: { full_name: d.full_name },
    });
    if (error) throw error.message.includes("already") ? { code: "23505", details: "email" } : error;
    if (d.phone) await supabase.from("profiles").update({ phone: d.phone }).eq("id", data.user.id);
    revalidatePath("/users");
    return { id: data.user.id };
  });
}

export async function updateEmployee(input: unknown) {
  const schema = z.object({ id: uuid(), full_name: requiredText("שם מלא", 100), phone: z.string().trim().max(30).nullable().optional(), role: z.enum(ROLES) });
  return runAction("users.manage", schema, input, async (d, { supabase, user }) => {
    if (d.id === user.id && d.role !== "admin") throw { code: "P0001", message: "אי אפשר להוריד לעצמך הרשאת מנהל מערכת" };
    const admin = createAdminClient();
    const { data: existing, error } = await admin.auth.admin.getUserById(d.id);
    if (error) throw error;
    const { error: upErr } = await admin.auth.admin.updateUserById(d.id, {
      app_metadata: { ...existing.user.app_metadata, role: d.role },
      user_metadata: { ...existing.user.user_metadata, full_name: d.full_name },
    });
    if (upErr) throw upErr;
    unwrap(await supabase.from("profiles").update({ full_name: d.full_name, phone: d.phone ?? null, role: d.role }).eq("id", d.id).select("id").single());
    revalidatePath("/users");
    return null;
  });
}

/** Deactivating also bans the auth user so existing sessions cannot refresh. History stays intact. */
export async function setEmployeeActive(id: string, active: boolean) {
  return runAction("users.manage", z.object({ id: uuid(), active: z.boolean() }), { id, active }, async (d, { supabase, user }) => {
    if (d.id === user.id && !d.active) throw { code: "P0001", message: "אי אפשר להשבית את המשתמש שלך" };
    const { error } = await createAdminClient().auth.admin.updateUserById(d.id, { ban_duration: d.active ? "none" : "876000h" });
    if (error) throw error;
    unwrap(await supabase.from("profiles").update({ is_active: d.active }).eq("id", d.id).select("id").single());
    revalidatePath("/users");
    return null;
  });
}

export async function resetEmployeePassword(id: string, newPassword: string) {
  return runAction("users.manage", z.object({ id: uuid(), password }), { id, password: newPassword }, async (d) => {
    const { error } = await createAdminClient().auth.admin.updateUserById(d.id, { password: d.password });
    if (error) throw error;
    return null;
  });
}
