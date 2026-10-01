"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import type { AddonId, AddonState } from "../addons";
import { readLocalAddons, saveAddons } from "../data/addons-admin";
import { useMode } from "./mode-store";
import { useRegion } from "./region-store";

/**
 * Add-on switches for the whole terminal.
 *
 * With Supabase the server hands over the stored value as `initial` and the
 * provider owns it from there. In mock mode the value is a per-browser
 * localStorage override, read through `useSyncExternalStore` (same approach as
 * persisted-session.ts) so hydration stays consistent with the server render.
 */

let localCache: AddonState | null | undefined;
const localListeners = new Set<() => void>();

function subscribeLocal(listener: () => void): () => void {
  localListeners.add(listener);
  return () => localListeners.delete(listener);
}
function getLocalSnapshot(): AddonState | null {
  if (localCache === undefined) localCache = readLocalAddons();
  return localCache;
}
function setLocal(next: AddonState) {
  localCache = next;
  for (const listener of localListeners) listener();
}

interface AddonsContextValue {
  addons: AddonState;
  /** Manager-only in the UI; RLS enforces it on Supabase. Rejects on failure. */
  setAddon(id: AddonId, enabled: boolean): Promise<void>;
}

const AddonsContext = createContext<AddonsContextValue | null>(null);

export function AddonsProvider({ initial, children }: { initial: AddonState; children: ReactNode }) {
  const isSupabase = useMode() === "actual";
  const [remote, setRemote] = useState(initial);
  const local = useSyncExternalStore(subscribeLocal, getLocalSnapshot, () => null);
  const stored = isSupabase ? remote : (local ?? initial);
  const { currency } = useRegion();
  // Benefit tenders only exist in some regions; the stored choice is kept.
  const addons = useMemo(() => (currency.ebt ? stored : { ...stored, ebt: false }), [stored, currency.ebt]);

  const setAddon = useCallback(
    async (id: AddonId, enabled: boolean) => {
      const previous = stored;
      const next = { ...stored, [id]: enabled };
      const apply = (state: AddonState) => (isSupabase ? setRemote(state) : setLocal(state));
      apply(next);
      try {
        await saveAddons(next, isSupabase);
      } catch (error) {
        apply(previous);
        throw error;
      }
    },
    [stored, isSupabase],
  );

  const value = useMemo(() => ({ addons, setAddon }), [addons, setAddon]);
  return <AddonsContext.Provider value={value}>{children}</AddonsContext.Provider>;
}

export function useAddons(): AddonsContextValue {
  const ctx = useContext(AddonsContext);
  if (!ctx) throw new Error("useAddons must be used inside <AddonsProvider>");
  return ctx;
}
