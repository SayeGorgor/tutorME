"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { getCurrentUser } from "@/lib/api/actions/client-actions";
import { initialAccountState, loadAccount, type AccountState } from "./account-state";

type UserContextType = AccountState & { loading: boolean; retry: () => void };
const UserContext = createContext<UserContextType | undefined>(undefined);

/** Each authenticated identity owns its state and in-flight request. */
function AccountProvider({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [state, setState] = useState<AccountState>(initialAccountState);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef<Promise<AccountState> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    // Strict Mode effect replay shares the same request, but only the active
    // effect may publish its result. The promise is never cached across users.
    if (!pending.current) pending.current = loadAccount(getCurrentUser);
    const request = pending.current;
    void request.then(result => { if (active) setState(result); }).finally(() => {
      if (pending.current === request) pending.current = null;
    });
    return () => { active = false; };
  }, [enabled, attempt]);

  const retry = () => {
    if (pending.current) return;
    setState(initialAccountState);
    setAttempt(value => value + 1);
  };
  return <UserContext.Provider value={{ ...state, loading: state.status === "loading", retry }}>{children}</UserContext.Provider>;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const pathname = usePathname();
  const subject = session?.user.id;
  const recovery = pathname === "/complete-registration";

  if (error || !subject) {
    const state: AccountState = error
      ? { status: error.status === 401 ? "unauthenticated" : "error", user: null, message: "Your session could not be checked. Retry or sign in again." }
      : isPending ? initialAccountState
      : { status: "unauthenticated", user: null, message: "Please sign in to continue." };
    return <UserContext.Provider value={{ ...state, loading: state.status === "loading", retry: () => { void refetch().catch(() => {}); } }}>{children}</UserContext.Provider>;
  }

  // Changing identity immediately unmounts old account data and child resources.
  // Ordinary protected navigation preserves this provider and does not refetch.
  // Completion performs its own account initialization and must remain reachable.
  return <AccountProvider key={`${subject}:${recovery}`} enabled={!recovery}>{children}</AccountProvider>;
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useCurrentUser must be used within a UserProvider");
  return context;
}
