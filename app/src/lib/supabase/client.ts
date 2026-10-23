import { createBrowserClient } from "@supabase/ssr";

import { readClientRuntime, type SupabaseConnection } from "../mode";

/**
 * Browser-side Supabase client.
 *
 * Unused in phase 1 — the app runs on the mock adapter — but wired and typed so
 * phase 2 only has to implement `supabaseAdapter` and `supabaseAuth`.
 */
export function createClient(override?: SupabaseConnection) {
  const connection = override ?? readClientRuntime().connection;

  if (!connection) {
    throw new Error(
      "Supabase is not connected. Connect it under Data Mode, or set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(connection.url, connection.anonKey);
}

/** True when both public Supabase vars are present at build time. */
export const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
