import type { Metadata } from "next";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getLookups } from "@/features/lookups";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReceiptForm } from "./receipt-form";

export const metadata: Metadata = { title: "קבלת סחורה חדשה" };

export default async function NewReceiptPage() {
  await requirePermission("stock.receive");
  const supabase = await createClient();
  const lookups = await getLookups(supabase);

  return (
    <>
      <PageHeader icon={PackagePlus} title="קבלת סחורה" description="רישום משלוח שהגיע. כל שורה הופכת לאצווה עם מספר ייחודי, ונכנסת למלאי במקרר שנבחר." />
      <ReceiptForm lookups={lookups} />
    </>
  );
}
