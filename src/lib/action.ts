import "server-only";
import { z } from "zod";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { toHebrewError } from "@/lib/errors";
import { can, type Permission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type Ctx = { supabase: Awaited<ReturnType<typeof createClient>>; user: CurrentUser };

/**
 * Standard Server Action wrapper: authenticates, checks the permission, validates the
 * input with Zod and converts any database error into a Hebrew message. The database
 * enforces the same rules again (RLS / RPC role checks).
 */
export async function runAction<S extends z.ZodType, T>(
  permission: Permission | null,
  schema: S,
  input: unknown,
  fn: (data: z.infer<S>, ctx: Ctx) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "פג תוקף ההתחברות. יש להתחבר מחדש." };
    if (permission && !can(user.role, permission)) return { ok: false, error: "אין לך הרשאה לבצע פעולה זו" };

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "יש לתקן את השדות המסומנים",
        fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
      };
    }
    const supabase = await createClient();
    return { ok: true, data: await fn(parsed.data, { supabase, user }) };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    console.error("[action]", error);
    return { ok: false, error: toHebrewError(error) };
  }
}

/** Throws the Supabase error (so runAction can translate it) or returns the data. */
export function unwrap<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error;
  return res.data as NonNullable<T>;
}

function isNextControlFlow(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR"));
}
