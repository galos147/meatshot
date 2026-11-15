"use client";

import { createContext, useContext } from "react";
import { can, type Permission } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/auth";

const UserContext = createContext<CurrentUser | null>(null);

export function UserProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <UserContext value={user}>{children}</UserContext>;
}

export function useCurrentUser(): CurrentUser {
  const user = useContext(UserContext);
  if (!user) throw new Error("useCurrentUser must be used inside UserProvider");
  return user;
}

/** UI-only permission check; the server and database enforce the real rules. */
export function useCan(permission: Permission): boolean {
  return can(useCurrentUser().role, permission);
}
