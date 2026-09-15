import type { PosDataAdapter } from "./adapter";
import { mockAdapter } from "./mock-adapter";

/**
 * Phase 1 always returns the mock adapter.
 *
 * To go live in phase 2:
 *   1. implement `supabaseAdapter` against the same `PosDataAdapter` interface
 *      (see supabase/schema.sql for the tables it maps to),
 *   2. set NEXT_PUBLIC_POS_DATA_SOURCE=supabase,
 *   3. return it from here.
 * Nothing else in the app needs to change.
 */
export function getDataAdapter(): PosDataAdapter {
  // const source = process.env.NEXT_PUBLIC_POS_DATA_SOURCE;
  // if (source === "supabase") return supabaseAdapter;
  return mockAdapter;
}

export type { PosDataAdapter };
export * from "./catalog";
export * from "./session";
