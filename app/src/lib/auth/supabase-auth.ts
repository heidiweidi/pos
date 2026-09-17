import { createClient } from "../supabase/client";
import type { Cashier } from "../types";
import type { AuthProvider, SignInResult } from "./types";

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/** Loads the terminal profile for a signed-in Supabase Auth user. */
async function loadCashier(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Cashier | null> {
  const { data: row, error } = await supabase
    .from("cashiers")
    .select("id, badge, full_name, email, role")
    .eq("id", userId)
    .eq("active", true)
    .maybeSingle();
  if (error || !row) return null;

  const { data: shift } = await supabase
    .from("shifts")
    .select("id, started_at, ended_at")
    .eq("cashier_id", userId)
    .eq("status", "open")
    .maybeSingle();

  return {
    id: row.id,
    name: row.full_name,
    badge: row.badge,
    role: row.role,
    pin: "",
    email: row.email,
    shiftId: shift?.id ?? "",
    shiftStart: formatTime(shift?.started_at),
    shiftEnd: formatTime(shift?.ended_at),
  };
}

/**
 * Phase 2 auth provider — Supabase Auth for the email/password sign-in, plus
 * the `verify_cashier_pin_by_id` RPC (SECURITY DEFINER, bcrypt-compares
 * server-side) for the lock-screen PIN. The plaintext PIN never touches a
 * client-side comparison and the hash never leaves the database.
 */
export const supabaseAuth: AuthProvider = {
  name: "supabase",

  async signIn(email, password): Promise<SignInResult> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? "Sign-in failed." };
    }

    const cashier = await loadCashier(supabase, data.user.id);
    if (!cashier) {
      await supabase.auth.signOut();
      return { ok: false, error: "This account has no terminal profile. Ask a manager to add you." };
    }
    return { ok: true, session: { cashier, signedInAt: new Date().toISOString() } };
  },

  async verifyPin(pin, cashierId): Promise<SignInResult> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("verify_cashier_pin_by_id", {
      p_pin: pin,
      p_cashier_id: cashierId ?? null,
    });
    const match = Array.isArray(data) ? data[0] : null;
    if (error || !match) {
      return { ok: false, error: "PIN not recognised for this terminal." };
    }

    const cashier = await loadCashier(supabase, match.id);
    if (!cashier) return { ok: false, error: "PIN not recognised for this terminal." };
    return { ok: true, session: { cashier, signedInAt: new Date().toISOString() } };
  },

  async signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  },
};
