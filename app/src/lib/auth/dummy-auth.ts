import { CASHIERS } from "../data/session";
import type { AuthProvider, SignInResult } from "./types";

/**
 * Phase-1 credentials — demo only, never shipped to a real lane.
 *
 *   sarah.jenkins@restohub.test / restohub  (manager,    PIN 4821)
 *   mike.torres@restohub.test   / restohub  (supervisor, PIN 8021)
 *   ana.reyes@restohub.test     / restohub  (cashier,    PIN 1357)
 */
export const DEMO_PASSWORD = "restohub";

export const dummyAuth: AuthProvider = {
  name: "dummy",

  async signIn(email, password): Promise<SignInResult> {
    const cashier = CASHIERS.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
    if (!cashier) return { ok: false, error: "No terminal account matches that email." };
    if (password !== DEMO_PASSWORD) return { ok: false, error: "Incorrect password." };
    return { ok: true, session: { cashier, signedInAt: new Date().toISOString() } };
  },

  async verifyPin(pin, cashierId): Promise<SignInResult> {
    const pool = cashierId ? CASHIERS.filter((c) => c.id === cashierId) : CASHIERS;
    const cashier = pool.find((c) => c.pin === pin);
    if (!cashier) return { ok: false, error: "PIN not recognised for this terminal." };
    return { ok: true, session: { cashier, signedInAt: new Date().toISOString() } };
  },

  async signOut() {
    /* Nothing to revoke for the dummy provider. */
  },
};
