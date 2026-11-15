import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SuppliersManager } from "./suppliers-manager";

export const metadata: Metadata = { title: "ספקים ומפעלים" };

export default async function SuppliersPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("*").order("name");

  return (
    <>
      <PageHeader icon={Truck} title="ספקים ומפעלים" description="מי מספק לכם את הסחורה – לכל אצווה נשמר הספק שלה" />
      <SuppliersManager rows={data ?? []} />
    </>
  );
}
