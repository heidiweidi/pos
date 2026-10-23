"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { readLocalRegion, saveRegion } from "../data/region-admin";
import { useMode } from "./mode-store";
import { setActiveCurrency, taxConfigFor, type TaxConfig } from "../money";
import { CURRENCIES, type CurrencyInfo, type RegionSettings } from "../region";

/**
 * Currency / tax / discount settings for the whole terminal. Same persistence
 * shape as addons-store.tsx: server-provided on Supabase, a per-browser
 * localStorage override in mock mode.
 */

let localCache: RegionSettings | null | undefined;
const localListeners = new Set<() => void>();

function subscribeLocal(listener: () => void): () => void {
  localListeners.add(listener);
  return () => localListeners.delete(listener);
}
function getLocalSnapshot(): RegionSettings | null {
  if (localCache === undefined) localCache = readLocalRegion();
  return localCache;
}
function setLocal(next: RegionSettings) {
  localCache = next;
  for (const listener of localListeners) listener();
}

interface RegionContextValue {
  region: RegionSettings;
  currency: CurrencyInfo;
  taxConfig: TaxConfig;
  /** Manager-only in the UI; RLS enforces it on Supabase. Rejects on failure. */
  saveRegion(next: RegionSettings): Promise<void>;
}

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ initial, children }: { initial: RegionSettings; children: ReactNode }) {
  const isSupabase = useMode() === "actual";
  const [remote, setRemote] = useState(initial);
  const local = useSyncExternalStore(subscribeLocal, getLocalSnapshot, () => null);
  const region = isSupabase ? remote : (local ?? initial);

  // Set during render so every `formatMoney` call beneath this provider — on
  // the server render and on hydration alike — already sees the right symbol.
  setActiveCurrency(region.currency);

  const save = useCallback(
    async (next: RegionSettings) => {
      const previous = region;
      const apply = (state: RegionSettings) => (isSupabase ? setRemote(state) : setLocal(state));
      apply(next);
      try {
        await saveRegion(next, isSupabase);
      } catch (error) {
        apply(previous);
        setActiveCurrency(previous.currency);
        throw error;
      }
    },
    [region, isSupabase],
  );

  const value = useMemo<RegionContextValue>(
    () => ({
      region,
      currency: CURRENCIES[region.currency],
      taxConfig: taxConfigFor(region),
      saveRegion: save,
    }),
    [region, save],
  );
  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used inside <RegionProvider>");
  return ctx;
}
