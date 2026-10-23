"use server";

import { adminClient, requireManager } from "../server/admin";

/**
 * Manager-only staff administration.
 *
 * Creating a login needs Supabase's admin API, which needs the service-role key.
 * That key must never reach the browser, so this runs as a server action and
 * only after proving the caller is an active manager on the same project the
 * key belongs to. Configure two server-side values (Worker secrets in
 * production, `.env.local` in dev):
 *
 *   SUPABASE_URL                (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

export type StaffRole = "cashier" | "supervisor" | "manager";
export type StaffResult = { ok: true } | { ok: false; error: string };

const ROLES: StaffRole[] = ["cashier", "supervisor", "manager"];

export interface NewStaffInput {
  fullName: string;
  email: string;
  password: string;
  badge: string;
  role: StaffRole;
  pin: string;
}

export async function createStaffAction(input: NewStaffInput): Promise<StaffResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const badge = input.badge.trim();

  if (!fullName) return { ok: false, error: "Enter the person's name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < 8) return { ok: false, error: "The password needs at least 8 characters." };
  if (!/^[A-Za-z0-9]{3,10}$/.test(badge)) return { ok: false, error: "Badge must be 3–10 letters or digits." };
  if (!ROLES.includes(input.role)) return { ok: false, error: "Choose a role." };
  if (!/^\d{4,6}$/.test(input.pin)) return { ok: false, error: "The PIN must be 4–6 digits." };

  const caller = await requireManager();
  if (!caller.ok) return caller;
  const admin = await adminClient();
  if (!admin.ok) return admin;

  // Fail early on a taken badge instead of after the login already exists.
  const { data: taken } = await admin.client.from("cashiers").select("id").eq("badge", badge).maybeSingle();
  if (taken) return { ok: false, error: `Badge ${badge} is already used.` };

  const created = await admin.client.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    const message = created.error?.message ?? "";
    return {
      ok: false,
      error: /already|registered|exists/i.test(message) ? "That email already has a login." : `Couldn't create the login: ${message}`,
    };
  }
  const id = created.data.user.id;

  const profile = await admin.client
    .from("cashiers")
    .insert({ id, badge, full_name: fullName, email, role: input.role });
  if (profile.error) {
    await admin.client.auth.admin.deleteUser(id);
    return { ok: false, error: `Couldn't save the staff profile: ${profile.error.message}` };
  }

  const pin = await admin.client.rpc("set_cashier_pin", { p_cashier: id, p_pin: input.pin });
  if (pin.error) {
    // No PIN would leave a user who can't unlock the lock screen; undo it all.
    await admin.client.from("cashiers").delete().eq("id", id);
    await admin.client.auth.admin.deleteUser(id);
    return { ok: false, error: `Couldn't set the PIN: ${pin.error.message}` };
  }
  return { ok: true };
}

/** Change someone's role and/or active flag. Managers can't edit themselves. */
export async function updateStaffAction(
  id: string,
  patch: { role?: StaffRole; active?: boolean },
): Promise<StaffResult> {
  const caller = await requireManager();
  if (!caller.ok) return caller;
  if (id === caller.userId) return { ok: false, error: "You can't change your own role or access." };
  if (patch.role !== undefined && !ROLES.includes(patch.role)) return { ok: false, error: "Choose a role." };

  // Through the caller's own session, so RLS ("managers manage cashiers") still applies.
  const { error } = await caller.supabase.from("cashiers").update(patch).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function resetPinAction(id: string, pin: string): Promise<StaffResult> {
  if (!/^\d{4,6}$/.test(pin)) return { ok: false, error: "The PIN must be 4–6 digits." };
  const caller = await requireManager();
  if (!caller.ok) return caller;
  const admin = await adminClient();
  if (!admin.ok) return admin;

  const { error } = await admin.client.rpc("set_cashier_pin", { p_cashier: id, p_pin: pin });
  return error ? { ok: false, error: error.message } : { ok: true };
}
