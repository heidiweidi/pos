import { dummyAuth } from "./dummy-auth";
import type { AuthProvider } from "./types";

/**
 * Phase 1 returns the dummy provider.
 *
 * Phase 2: implement `supabaseAuth` (signInWithPassword + a `cashiers` row for
 * the badge/role/PIN hash), set NEXT_PUBLIC_POS_AUTH=supabase, and return it
 * here. The login screen and lock overlay consume only this interface.
 */
export function getAuthProvider(): AuthProvider {
  // if (process.env.NEXT_PUBLIC_POS_AUTH === "supabase") return supabaseAuth;
  return dummyAuth;
}

export { DEMO_PASSWORD } from "./dummy-auth";
export type { AuthProvider, AuthSession, SignInResult } from "./types";
