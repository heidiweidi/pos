import { getRuntime } from "../mode-server";
import type { PosDataAdapter } from "./adapter";
import { mockAdapter } from "./mock-adapter";
import { supabaseAdapter } from "./supabase-adapter";

/**
 * Actual mode (the Data Mode admin setting, or NEXT_PUBLIC_POS_DATA_SOURCE=supabase
 * as the default) switches every screen that reads through this seam onto the
 * live Postgres schema. `supabaseAdapter` uses the server-side Supabase client,
 * so only call this from server code.
 */
export async function getDataAdapter(): Promise<PosDataAdapter> {
  const { mode } = await getRuntime();
  return mode === "actual" ? supabaseAdapter : mockAdapter;
}

export type { PosDataAdapter };
export * from "./catalog";
export * from "./session";
