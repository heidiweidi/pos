import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";

import { getRuntime } from "../mode-server";
import { createClient } from "../supabase/server";

/**
 * Server-only helpers for actions that need the service-role key. That key must
 * never reach the browser, so every caller first proves the requester is an
 * active manager on the same Supabase project the key belongs to.
 */

export type Failure = { ok: false; error: string };
// The project has no generated DB types, so rows are untyped like the other Supabase clients here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminClient = SupabaseClient<any, "public", any>;

/** The signed-in caller, only if they are an active manager. */
export async function requireManager(): Promise<
  Failure | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "You're signed out. Sign in again." };

  const { data: me } = await supabase
    .from("cashiers")
    .select("id, role, active")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!me?.active || me.role !== "manager") return { ok: false, error: "Only a manager can do that." };
  return { ok: true, supabase, userId: auth.user.id };
}

/** A service-role client, but only for the project this deployment is configured for. */
export async function adminClient(): Promise<Failure | { ok: true; client: AdminClient }> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      ok: false,
      error:
        "This needs server-side setup: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server (see the Staff page).",
    };
  }

  // The connection a manager can pick in the browser is a cookie, so it must
  // never decide where the secret key is sent.
  const { connection } = await getRuntime();
  if (!connection || new URL(connection.url).origin !== new URL(url).origin) {
    return { ok: false, error: "This terminal is connected to a different Supabase project than the server is configured for." };
  }

  return {
    ok: true,
    client: createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }),
  };
}
