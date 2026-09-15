import type { Cashier } from "../types";

export interface AuthSession {
  cashier: Cashier;
  signedInAt: string;
}

export type SignInResult =
  | { ok: true; session: AuthSession }
  | { ok: false; error: string };

/**
 * Auth seam. `dummyAuth` backs phase 1; `supabaseAuth` (phase 2) implements the
 * same three calls against Supabase Auth plus the `cashiers` profile table.
 */
export interface AuthProvider {
  readonly name: "dummy" | "supabase";
  signIn(email: string, password: string): Promise<SignInResult>;
  /** Re-unlocks a locked terminal for the signed-in cashier, or a handover. */
  verifyPin(pin: string, cashierId?: string): Promise<SignInResult>;
  signOut(): Promise<void>;
}
