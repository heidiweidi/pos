import { dummyAuth } from "./dummy-auth";
import { supabaseAuth } from "./supabase-auth";
import type { PosMode } from "../mode";
import type { AuthProvider } from "./types";

/**
 * Actual mode switches sign-in and PIN unlock onto
 * Supabase Auth + the `cashiers` table. The login screen and lock overlay
 * consume only this interface, so nothing else has to change.
 */
export function getAuthProvider(mode: PosMode): AuthProvider {
  return mode === "actual" ? supabaseAuth : dummyAuth;
}

export { DEMO_PASSWORD } from "./dummy-auth";
export type { AuthProvider, AuthSession, SignInResult } from "./types";
