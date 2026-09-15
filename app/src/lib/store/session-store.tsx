"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { getAuthProvider } from "../auth";
import type { Cashier } from "../types";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  writeSession,
} from "./persisted-session";

export interface SessionContextValue {
  cashier: Cashier | null;
  signedInAt: string | null;
  /** True while the terminal is PIN-locked but a cashier is still signed in. */
  locked: boolean;
  /** Session restore hasn't finished yet — don't redirect on this render. */
  loading: boolean;

  signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }>;
  /** Unlocks the terminal, or hands it to another cashier who knows their PIN. */
  unlock(pin: string): Promise<{ ok: boolean; error?: string }>;
  lock(): void;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  cashiers,
}: {
  children: ReactNode;
  cashiers: Cashier[];
}) {
  const router = useRouter();
  const auth = useMemo(() => getAuthProvider(), []);

  // The persisted sign-in lives in localStorage, which is an external store.
  const persisted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const loading = persisted === undefined;

  const cashier = useMemo(() => {
    if (!persisted) return null;
    return cashiers.find((c) => c.id === persisted.cashierId) ?? null;
  }, [persisted, cashiers]);

  const signIn = useCallback<SessionContextValue["signIn"]>(
    async (email, password) => {
      const result = await auth.signIn(email, password);
      if (!result.ok) return { ok: false, error: result.error };
      writeSession({
        cashierId: result.session.cashier.id,
        signedInAt: result.session.signedInAt,
        locked: false,
      });
      return { ok: true };
    },
    [auth],
  );

  const unlock = useCallback<SessionContextValue["unlock"]>(
    async (pin) => {
      const result = await auth.verifyPin(pin);
      if (!result.ok) return { ok: false, error: result.error };
      writeSession({
        cashierId: result.session.cashier.id,
        signedInAt: result.session.signedInAt,
        locked: false,
      });
      return { ok: true };
    },
    [auth],
  );

  const lock = useCallback(() => {
    if (!persisted) return;
    writeSession({ ...persisted, locked: true });
  }, [persisted]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    writeSession(null);
    router.replace("/login");
  }, [auth, router]);

  const value = useMemo<SessionContextValue>(
    () => ({
      cashier,
      signedInAt: persisted?.signedInAt ?? null,
      locked: Boolean(persisted?.locked) && Boolean(cashier),
      loading,
      signIn,
      unlock,
      lock,
      signOut,
    }),
    [cashier, persisted, loading, signIn, unlock, lock, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
