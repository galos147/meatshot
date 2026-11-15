"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { titleFor } from "@/config/nav";
import { useCan } from "./user-context";

export function Topbar({ openAlerts, storeName }: { openAlerts: number; storeName: string }) {
  const pathname = usePathname();
  const canSell = useCan("sales.create");
  const title = titleFor(pathname);

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/65 md:px-5">
      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="hidden truncate text-sm text-muted-foreground sm:inline">{storeName}</span>
        {title && (
          <>
            <span className="hidden text-muted-foreground/50 sm:inline">/</span>
            <span className="truncate text-sm font-medium">{title}</span>
          </>
        )}
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <Button asChild variant="ghost" size="icon-lg" className="relative" aria-label="התראות">
          <Link href="/alerts">
            <Bell className="size-[1.15rem]" />
            {openAlerts > 0 && (
              <span className="absolute top-1 end-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold leading-4 text-primary-foreground ring-2 ring-background">
                {openAlerts > 99 ? "99+" : openAlerts}
              </span>
            )}
          </Link>
        </Button>
        {canSell && pathname !== "/sales/new" && (
          <Button asChild size="lg" className="gap-2 px-3.5 shadow-sm shadow-primary/30">
            <Link href="/sales/new">
              <ShoppingCart className="size-4" />
              <span className="hidden sm:inline">מכירה חדשה</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
