import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, ShieldCheck, Snowflake } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "התחברות" };

const features = [
  { icon: CalendarClock, title: "שליטה בתפוגה", text: "FEFO אוטומטי והתראות 14 / 7 / 3 ימים" },
  { icon: ShieldCheck, title: "הכשר מדויק לכל אצווה", text: "חסימת מכירה שלא תואמת את דרישת הכשרות" },
  { icon: Snowflake, title: "כל מקרר במקום", text: "מלאי לפי מקרר, מקפיא ומדף, בזמן אמת" },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-12 text-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">ברוכים השבים</h1>
          <p className="mt-2 text-muted-foreground">התחברו כדי לנהל את המלאי, המכירות והאספקה.</p>
          <LoginForm />
          <p className="mt-10 text-xs text-muted-foreground">אין לכם משתמש? מנהל המערכת יוצר משתמשים במסך העובדים.</p>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -start-32 size-[34rem] rounded-full bg-[oklch(0.5_0.18_22)] opacity-40 blur-3xl" />
          <div className="absolute -bottom-48 -end-40 size-[30rem] rounded-full bg-[oklch(0.62_0.16_45)] opacity-25 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <Logo className="relative" />

        <div className="relative max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            מערכת פנימית לצוות החנות
          </p>
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
            כל קילו בשר,
            <br />
            <span className="bg-gradient-to-l from-[oklch(0.8_0.12_50)] to-[oklch(0.7_0.17_25)] bg-clip-text text-transparent">
              מהמשאית ועד הקופה.
            </span>
          </h2>
          <ul className="mt-10 space-y-5">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-white">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold text-white">{title}</span>
                  <span className="text-sm text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© MEAT STOCK</p>
      </aside>
    </main>
  );
}
