import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { Topbar } from "@/components/shell/topbar";
import { UserProvider } from "@/components/shell/user-context";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ count }, { data: settings }, cookieStore] = await Promise.all([
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("app_settings").select("store_name").eq("id", 1).maybeSingle(),
    cookies(),
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <UserProvider user={user}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar openAlerts={count ?? 0} />
        <SidebarInset className="min-w-0 bg-background">
          <Topbar openAlerts={count ?? 0} storeName={settings?.store_name ?? "MEAT STOCK"} />
          <div className="mx-auto w-full max-w-[1600px] flex-1 p-4 md:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </UserProvider>
  );
}
