"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  createStaffAction,
  resetPinAction,
  updateStaffAction,
  type StaffRole,
} from "@/lib/data/staff-actions";
import { useMode } from "@/lib/store/mode-store";
import { usePos } from "@/lib/store/pos-store";
import { useSession } from "@/lib/store/session-store";
import { createClient } from "@/lib/supabase/client";

interface StaffRow {
  id: string;
  badge: string;
  full_name: string;
  email: string;
  role: StaffRole;
  active: boolean;
}

const ROLES: { id: StaffRole; label: string; hint: string }[] = [
  { id: "cashier", label: "Cashier", hint: "Rings up sales" },
  { id: "supervisor", label: "Supervisor", hint: "Cashier + approvals and shift reports" },
  { id: "manager", label: "Manager", hint: "Everything, including products, add-ons and staff" },
];

const EMPTY = { fullName: "", email: "", password: "", badge: "", role: "cashier" as StaffRole, pin: "" };

/** Manager-only: add staff logins, assign roles, deactivate, reset PINs. */
export function StaffAdmin() {
  const { cashier } = useSession();
  const mode = useMode();
  const { showToast } = usePos();

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isManager = cashier?.role === "manager";

  // No setState before the first await, so the effect can call this directly.
  async function refresh() {
    try {
      const { data, error } = await createClient()
        .from("cashiers")
        .select("id, badge, full_name, email, role, active")
        .order("badge");
      if (error) throw error;
      setStaff(data as StaffRow[]);
      setLoadError(null);
    } catch (error) {
      console.error("[StaffAdmin] load failed:", error);
      setLoadError("Couldn't load the staff list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isManager || mode !== "actual") return;
    // One fetch on mount; setState runs after the promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [isManager, mode]);

  if (!isManager) {
    return (
      <Notice icon="lock" title="Manager access required">
        Only a manager account can manage staff.
      </Notice>
    );
  }
  if (mode !== "actual") {
    return (
      <Notice icon="science" title="Demo mode">
        Staff accounts live in Supabase. Switch to Actual mode under Data Mode to manage them.
      </Notice>
    );
  }

  const suggestedBadge = () => {
    const max = staff.reduce((m, s) => Math.max(m, Number.parseInt(s.badge, 10) || 0), 0);
    return String(max + 1).padStart(4, "0");
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    const result = await createStaffAction({ ...form, badge: form.badge || suggestedBadge() });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    showToast({ title: `${form.fullName.trim()} added`, detail: `Signs in as ${form.email.trim()}`, tone: "success" });
    setForm(EMPTY);
    void refresh();
  }

  async function changeRole(row: StaffRow, role: StaffRole) {
    const result = await updateStaffAction(row.id, { role });
    if (!result.ok) return showToast({ title: "Couldn't change role", detail: result.error, tone: "error" });
    setStaff((prev) => prev.map((s) => (s.id === row.id ? { ...s, role } : s)));
    showToast({ title: `${row.full_name} is now ${role}`, tone: "success" });
  }

  async function toggleActive(row: StaffRow) {
    const result = await updateStaffAction(row.id, { active: !row.active });
    if (!result.ok) return showToast({ title: "Couldn't update access", detail: result.error, tone: "error" });
    setStaff((prev) => prev.map((s) => (s.id === row.id ? { ...s, active: !s.active } : s)));
    showToast({
      title: row.active ? `${row.full_name} deactivated` : `${row.full_name} reactivated`,
      tone: row.active ? "warning" : "success",
    });
  }

  async function resetPin(row: StaffRow) {
    const pin = window.prompt(`New 4–6 digit PIN for ${row.full_name}:`);
    if (!pin) return;
    const result = await resetPinAction(row.id, pin.trim());
    showToast(
      result.ok
        ? { title: `PIN updated for ${row.full_name}`, tone: "success" }
        : { title: "Couldn't reset PIN", detail: result.error, tone: "error" },
    );
  }

  const card = "bg-surface-container-lowest rounded-xl p-space-md shadow-sm";
  const input =
    "w-full h-11 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary";
  const setupNeeded = formError?.includes("server-side setup");

  return (
    <div className="p-space-md flex flex-col gap-space-md max-w-[1100px] mx-auto w-full">
      <div className={card}>
        <h1 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
          <Icon name="group_add" className="text-primary" />
          Staff
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Add a login for each person and choose what they can do. They sign in with their email and password, and
          unlock the lane with their PIN.
        </p>
      </div>

      <form onSubmit={submit} className={`${card} grid grid-cols-1 md:grid-cols-2 gap-space-sm`}>
        <span className="md:col-span-2 font-label-lg text-label-lg text-on-surface">Add a user</span>
        <input
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          placeholder="Full name"
          aria-label="Full name"
          className={input}
          required
        />
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email (their login)"
          aria-label="Email"
          className={input}
          required
        />
        <input
          type="text"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="Starting password (8+ characters)"
          aria-label="Starting password"
          autoComplete="off"
          className={input}
          required
        />
        <input
          value={form.badge}
          onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
          placeholder={`Badge # (blank = ${suggestedBadge()})`}
          aria-label="Badge number"
          className={input}
        />
        <input
          value={form.pin}
          onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
          placeholder="Lock-screen PIN (4–6 digits)"
          aria-label="PIN"
          inputMode="numeric"
          autoComplete="off"
          className={input}
          required
        />
        <label className="flex flex-col gap-1">
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
            aria-label="Role"
            className={input}
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} — {r.hint}
              </option>
            ))}
          </select>
        </label>

        {formError ? (
          <div className="md:col-span-2 flex items-start gap-space-xs p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
            <Icon name="error" className="text-base shrink-0" />
            <div>
              <p>{formError}</p>
              {setupNeeded ? (
                <p className="mt-1">
                  On Cloudflare run <code>npx wrangler secret put SUPABASE_URL</code> and{" "}
                  <code>npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY</code> (Project Settings → API Keys →
                  service_role / secret key), then redeploy.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-11 px-space-lg rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add user"}
          </button>
        </div>
      </form>

      <div className={card}>
        <span className="font-label-lg text-label-lg text-on-surface block mb-space-sm">
          Team ({staff.length})
        </span>
        {loading ? (
          <p className="py-space-md text-center text-on-surface-variant">Loading staff…</p>
        ) : loadError ? (
          <p className="py-space-md text-center text-error">{loadError}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-surface-container-high">
                  <th className="py-space-xs pr-space-sm">Person</th>
                  <th className="py-space-xs pr-space-sm">Badge</th>
                  <th className="py-space-xs pr-space-sm">Role</th>
                  <th className="py-space-xs pr-space-sm">Access</th>
                  <th className="py-space-xs text-right">PIN</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((row) => {
                  const isSelf = row.id === cashier?.id;
                  return (
                    <tr key={row.id} className={`border-b border-surface-container-low ${row.active ? "" : "opacity-50"}`}>
                      <td className="py-space-sm pr-space-sm">
                        <div className="font-label-md text-label-md text-on-surface">
                          {row.full_name}
                          {isSelf ? <span className="text-on-surface-variant font-normal"> (you)</span> : null}
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">{row.email}</div>
                      </td>
                      <td className="py-space-sm pr-space-sm font-body-sm text-body-sm">#{row.badge}</td>
                      <td className="py-space-sm pr-space-sm">
                        <select
                          value={row.role}
                          disabled={isSelf}
                          onChange={(e) => void changeRole(row, e.target.value as StaffRole)}
                          aria-label={`Role for ${row.full_name}`}
                          className="h-9 px-2 bg-surface-container-low rounded-lg font-body-md text-body-md disabled:opacity-60"
                        >
                          {ROLES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-space-sm pr-space-sm">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => void toggleActive(row)}
                          className={`font-label-sm text-label-sm px-space-sm py-1 rounded disabled:opacity-60 ${
                            row.active
                              ? "bg-primary-container text-on-primary-container"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {row.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-space-sm text-right">
                        <button
                          type="button"
                          onClick={() => void resetPin(row)}
                          className="font-label-sm text-label-sm text-primary hover:underline"
                        >
                          Reset PIN
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="p-space-md max-w-xl mx-auto w-full">
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm text-center flex flex-col items-center gap-space-sm">
        <Icon name={icon} className="text-4xl text-outline" />
        <h1 className="font-headline-sm text-headline-sm text-on-surface">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{children}</p>
      </div>
    </div>
  );
}
