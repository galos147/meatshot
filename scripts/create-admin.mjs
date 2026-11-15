// Creates (or promotes) the first administrator.
// Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> "<full name>"
import { createClient } from "@supabase/supabase-js";

const [email, password, fullName = "מנהל מערכת"] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> "<full name>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    app_metadata: { ...existing.app_metadata, role: "admin" },
    user_metadata: { ...existing.user_metadata, full_name: fullName },
  });
  if (error) throw error;
  await admin.from("profiles").update({ is_active: true, full_name: fullName }).eq("id", existing.id);
  console.log(`✔ ${email} is now an active admin.`);
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  console.log(`✔ Admin ${email} created.`);
}
