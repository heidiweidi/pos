"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  FAST_KEY_TABS,
  PLU_CATEGORIES,
  PLU_GRID_IDS,
  PLU_SPEED_KEYS,
  PRODUCTS,
  PRODUCT_BY_ID,
} from "../data/catalog";
import { mapRow } from "../data/live-lookup";
import { createClient } from "../supabase/client";
import type { Product } from "../types";
import { useMode } from "./mode-store";

/**
 * The product catalog every register screen reads.
 *
 * Demo mode serves the bundled sample catalog. Actual mode loads the store's
 * own inventory from Supabase (RLS lets any signed-in staff member read it) and
 * derives the fast-key tabs and PLU directory from it, so nothing from the demo
 * catalog is ever shown against real prices.
 */

export interface FastKeyTab {
  id: string;
  label: string;
  productIds: string[];
}
export interface PluCategory {
  id: string;
  label: string;
  count?: number;
  dot?: boolean;
}

export interface CatalogValue {
  products: Product[];
  byId: Map<string, Product>;
  fastKeyTabs: FastKeyTab[];
  pluCategories: PluCategory[];
  /** Products shown in the PLU directory grid. */
  pluGrid: Product[];
  pluSpeedKeys: { plu: string; label: string }[];
  lookupByCode(code: string): Product | undefined;
  loading: boolean;
  error: string | null;
  /** Re-reads the inventory (after Manage Products edits). No-op in demo mode. */
  refresh(): Promise<void>;
}

const CatalogContext = createContext<CatalogValue | null>(null);

const titleCase = (s: string) =>
  s.replace(/(^|[-\s])(\w)/g, (_, sep: string, c: string) => `${sep === "-" ? " " : sep}${c.toUpperCase()}`);

function derive(products: Product[]) {
  const byId = new Map(products.map((p) => [p.id, p]));

  const departments = [...new Set(products.map((p) => p.department))].sort();
  const fastKeyTabs: FastKeyTab[] = departments.map((d) => ({
    id: d.toLowerCase(),
    label: d,
    productIds: products.filter((p) => p.department === d).map((p) => p.id),
  }));

  const pluGrid = products.filter((p) => p.plu);
  const cats = [...new Set(pluGrid.flatMap((p) => p.categories ?? []))].filter((c) => c !== "all").sort();
  const pluCategories: PluCategory[] = [
    { id: "all", label: "All Items", count: pluGrid.length },
    ...cats.map((c) => ({ id: c, label: titleCase(c) })),
  ];
  const pluSpeedKeys = pluGrid.slice(0, 5).map((p) => ({ plu: p.plu as string, label: p.name }));

  return { byId, fastKeyTabs, pluGrid, pluCategories, pluSpeedKeys };
}

const demoDerived = {
  byId: PRODUCT_BY_ID,
  fastKeyTabs: FAST_KEY_TABS,
  pluGrid: PLU_GRID_IDS.map((id) => PRODUCT_BY_ID.get(id)).filter((p): p is Product => Boolean(p)),
  pluCategories: PLU_CATEGORIES,
  pluSpeedKeys: PLU_SPEED_KEYS,
};

const codeMatch = (list: Product[], code: string) => {
  const q = code.trim();
  return q ? list.find((p) => p.plu === q || p.upc === q || p.sku === q) : undefined;
};

export function CatalogProvider({ children }: { children: ReactNode }) {
  const mode = useMode();
  const [live, setLive] = useState<{ products: Product[]; loading: boolean; error: string | null }>({
    products: [],
    loading: mode === "actual",
    error: null,
  });

  // No setState before the first await, so calling this from the effect below
  // never cascades a synchronous render.
  const load = useCallback(async () => {
    if (mode !== "actual") return;
    try {
      const { data, error } = await createClient()
        .from("products")
        .select("*")
        .eq("active", true)
        .order("department")
        .order("name");
      if (error) throw error;
      const products = (data ?? []).map((row) => mapRow(row as Parameters<typeof mapRow>[0]));
      setLive({ products, loading: false, error: null });
    } catch (error) {
      console.error("[catalog] inventory load failed:", error);
      setLive((s) => ({ ...s, loading: false, error: "Couldn't load the inventory from Supabase." }));
    }
  }, [mode]);

  useEffect(() => {
    // One fetch on mount (and when the mode changes); setState runs after the
    // promise settles, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const value = useMemo<CatalogValue>(() => {
    if (mode !== "actual") {
      return {
        products: PRODUCTS,
        ...demoDerived,
        lookupByCode: (code) => codeMatch(PRODUCTS, code),
        loading: false,
        error: null,
        refresh: async () => {},
      };
    }
    return {
      products: live.products,
      ...derive(live.products),
      lookupByCode: (code) => codeMatch(live.products, code),
      loading: live.loading,
      error: live.error,
      refresh: load,
    };
  }, [mode, live, load]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}
