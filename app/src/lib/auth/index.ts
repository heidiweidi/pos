import { dummyAuth } from "./dummy-auth";
import { supabaseAuth } from "./supabase-auth";
import type { AuthProvider } from "./types";

/**
 * Phase 2: NEXT_PUBLIC_POS_AUTH=supabase switches sign-in and PIN unlock onto
 * Supabase Auth + the `cashiers` table. The login screen and lock overlay
 * consume only this interface, so nothing else has to change.
 */
export function getAuthProvider(): AuthProvider {
  if (process.env.NEXT_PUBLIC_POS_AUTH === "supabase") return supabaseAuth;
  return dummyAuth;
}

export { DEMO_PASSWORD } from "./dummy-auth";
export type { AuthProvider, AuthSession, SignInResult } from "./types";
