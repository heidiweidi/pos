"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ADDONS, type AddonId } from "@/lib/addons";
import { useAddons } from "@/lib/store/addons-store";
import { usePos } from "@/lib/store/pos-store";
import { useSession } from "@/lib/store/session-store";

/** Manager-only switchboard for the optional POS features. */
export function AddonsAdmin() {
  const { cashier } = useSession();
  const { addons, setAddon } = useAddons();
  const { showToast } = usePos();
  const [pending, setPending] = useState<AddonId | null>(null);

  if (cashier?.role !== "manager") {
    return (
      <div className="p-space-md max-w-xl mx-auto w-full">
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm text-center flex flex-col items-center gap-space-sm">
          <Icon name="lock" className="text-4xl text-outline" />
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Manager access required</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Add-ons can only be changed by a manager account.
          </p>
        </div>
      </div>
    );
  }

  async function toggle(id: AddonId, label: string) {
    const enabled = !addons[id];
    setPending(id);
    try {
      await setAddon(id, enabled);
      showToast({ title: `${label} ${enabled ? "enabled" : "disabled"}`, tone: "success" });
    } catch (error) {
      console.error("[AddonsAdmin] save failed:", error);
      showToast({
        title: "Couldn't save the change",
        detail: "Check the connection (and that supabase/addons.sql has been run).",
        tone: "error",
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="p-space-md flex flex-col gap-space-md max-w-3xl mx-auto w-full">
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <h1 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
          <Icon name="extension" className="text-primary" />
          Add-ons
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          The register runs as a simple scan, cart and pay terminal. Turn on only the extras this lane needs —
          they appear for every cashier straight away, and turning one off hides it without losing any data.
        </p>
      </div>

      <ul className="flex flex-col gap-space-sm">
        {ADDONS.map((addon) => {
          const on = addons[addon.id];
          return (
            <li
              key={addon.id}
              className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start gap-space-md"
            >
              <span
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  on ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                <Icon name={addon.icon} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-label-lg text-label-lg text-on-surface">{addon.label}</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{addon.description}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                  Adds: {addon.adds.join(" • ")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${addon.label} add-on`}
                disabled={pending === addon.id}
                onClick={() => void toggle(addon.id, addon.label)}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-60 ${
                  on ? "bg-primary" : "bg-surface-container-highest"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-surface-container-lowest shadow transition-transform ${
                    on ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
