"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { activeHref, NAV } from "@/config/nav";
import { signOut } from "@/features/auth/actions";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { useCurrentUser } from "./user-context";

export function AppSidebar({ openAlerts }: { openAlerts: number }) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const active = activeHref(pathname);
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar side="right" collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link href="/dashboard" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <Logo className="group-data-[collapsible=icon]:hidden" />
          <Logo compact className="hidden group-data-[collapsible=icon]:flex" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 pb-4">
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.permission || can(user.role, i.permission));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label} className="py-1.5">
              <SidebarGroupLabel className="text-[0.7rem] font-semibold tracking-wide text-sidebar-foreground/45">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isActive = item.href === active;
                    const isPos = item.href === "/sales/new";
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className={
                            isPos
                              ? "bg-sidebar-primary/90 font-semibold text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                              : "relative text-sidebar-foreground/80 data-active:text-white data-active:before:absolute data-active:before:inset-y-1.5 data-active:before:start-0 data-active:before:w-[3px] data-active:before:rounded-full data-active:before:bg-sidebar-primary"
                          }
                        >
                          <Link href={item.href} onClick={() => setOpenMobile(false)}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.badgeKey === "alerts" && openAlerts > 0 && (
                          <SidebarMenuBadge className="rounded-full bg-sidebar-primary px-1.5 text-[0.7rem] text-white">
                            {openAlerts > 99 ? "99+" : openAlerts}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary/25 font-semibold text-white">
                      {initials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start leading-tight">
                    <span className="truncate font-semibold text-white">{user.fullName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{ROLE_LABELS[user.role]}</span>
                  </div>
                  <ChevronsUpDown className="ms-auto size-4 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="font-semibold">{user.fullName}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={signOut}>
                  <DropdownMenuItem asChild variant="destructive">
                    <button type="submit" className="w-full">
                      <LogOut />
                      התנתקות
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}
