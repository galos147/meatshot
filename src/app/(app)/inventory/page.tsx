import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockTable } from "@/features/inventory/stock-table";
import { getLookups } from "@/features/lookups";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ProductStockTable } from "./product-stock-table";

export const metadata: Metadata = { title: "מלאי" };

export default async function InventoryPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: stock }, { data: products }, lookups, { data: bodies }] = await Promise.all([
    supabase.from("v_stock").select("*").order("expiry_date"),
    supabase.from("v_product_stock").select("*").eq("is_active", true).order("product_name"),
    getLookups(supabase),
    supabase.from("kosher_bodies").select("id, name").order("name"),
  ]);

  return (
    <>
      <PageHeader
        icon={Boxes}
        title="מלאי"
        description="המלאי בפועל – לפי מוצר, ולפי אצווה ומיקום. כל שינוי נרשם ביומן התנועות."
        actions={
          can(user.role, "stock.receive") && (
            <Button asChild size="lg"><Link href="/receiving/new"><PackagePlus />קבלת סחורה</Link></Button>
          )
        }
      />
      <Tabs defaultValue="products" className="gap-4">
        <TabsList>
          <TabsTrigger value="products">לפי מוצר</TabsTrigger>
          <TabsTrigger value="batches">לפי אצווה ומיקום ({stock?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductStockTable rows={products ?? []} categories={lookups.categories} />
        </TabsContent>
        <TabsContent value="batches">
          <StockTable
            rows={stock ?? []}
            locations={lookups.locations}
            filterOptions={{
              warehouses: lookups.warehouses,
              locations: lookups.locations.map(({ value, label }) => ({ value, label })),
              kosherBodies: (bodies ?? []).map((b) => ({ value: b.id, label: b.name })),
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
