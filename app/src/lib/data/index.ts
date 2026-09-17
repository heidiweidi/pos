import type { PosDataAdapter } from "./adapter";
import { mockAdapter } from "./mock-adapter";
import { supabaseAdapter } from "./supabase-adapter";

/**
 * Phase 2: NEXT_PUBLIC_POS_DATA_SOURCE=supabase switches every screen that
 * reads through this seam onto the live Postgres schema. `supabaseAdapter`
 * uses the server-side Supabase client, so only call this from server code.
 */
export function getDataAdapter(): PosDataAdapter {
  const source = process.env.NEXT_PUBLIC_POS_DATA_SOURCE;
  if (source === "supabase") return supabaseAdapter;
  return mockAdapter;
}

export type { PosDataAdapter };
export * from "./catalog";
export * from "./session";
