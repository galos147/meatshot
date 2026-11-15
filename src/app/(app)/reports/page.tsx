import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileBarChart, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { REPORTS } from "@/features/reports/registry";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "דוחות" };

export default async function ReportsPage() {
  const user = await requireUser();
  const groups = [...new Set(REPORTS.map((r) => r.group))];

  return (
    <>
      <PageHeader icon={FileBarChart} title="דוחות" description="כל דוח ניתן לסינון, הדפסה, שמירה כ-PDF וייצוא ל-Excel" />
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">{g}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {REPORTS.filter((r) => r.group === g).map((r) => {
                const allowed = !r.permission || can(user.role, r.permission);
                const body = (
                  <div className={`group flex h-full items-start gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-all ${allowed ? "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md" : "opacity-50"}`}>
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      {allowed ? <FileBarChart className="size-5" /> : <Lock className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 font-semibold">
                        {r.title}
                        {allowed && <ArrowLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                );
                return allowed ? <Link key={r.slug} href={`/reports/${r.slug}`}>{body}</Link> : <div key={r.slug}>{body}</div>;
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
