"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import type { ShopeeEnv } from "@/lib/shopee/api";
import {
  disconnectShopeeAction,
  finishShopeeSyncAction,
  getShopeeAuthUrlAction,
  getShopeeStatusAction,
  saveShopeeConfigAction,
  syncShopeeStepAction,
  type ShopeeStatus,
} from "@/lib/shopee/actions";
import { useCatalog } from "@/lib/store/catalog-store";
import { usePos } from "@/lib/store/pos-store";

const MAX_STEPS = 500;

/** Shopee connection card for Data Mode: credentials, authorise, and a read-only product sync. */
export function ShopeeSync() {
  const { showToast } = usePos();
  const { refresh: refreshCatalog } = useCatalog();

  const [status, setStatus] = useState<ShopeeStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [env, setEnv] = useState<ShopeeEnv>("production");
  const [partnerId, setPartnerId] = useState("");
  const [partnerKey, setPartnerKey] = useState("");
  const [department, setDepartment] = useState("Grocery");
  const [departmentCode, setDepartmentCode] = useState("00");
  const [taxFlag, setTaxFlag] = useState<"F" | "T">("T");
  const [busy, setBusy] = useState<null | "save" | "auth" | "sync" | "disconnect">(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function adopt(next: ShopeeStatus) {
    setStatus(next);
    setEnv(next.env);
    setPartnerId(next.partnerId);
    setDepartment(next.defaults.department);
    setDepartmentCode(next.defaults.departmentCode);
    setTaxFlag(next.defaults.taxFlag);
  }

  // No setState before the first await, so the effect can call this directly.
  async function load() {
    const result = await getShopeeStatusAction();
    if (!result.ok) return setLoadError(result.error);
    adopt(result.status);

    // Back from Shopee's authorisation page?
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("shopee");
    if (outcome) {
      window.history.replaceState(null, "", window.location.pathname);
      if (outcome === "connected") showToast({ title: "Shopee connected", detail: "You can sync products now.", tone: "success" });
      else showToast({ title: "Shopee authorisation failed", detail: params.get("reason") ?? undefined, tone: "error" });
    }
  }

  useEffect(() => {
    // One fetch on mount; setState runs after the promise settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy("save");
    setFormError(null);
    const result = await saveShopeeConfigAction({
      env,
      partnerId,
      partnerKey,
      defaults: { department, departmentCode, taxFlag },
    });
    setBusy(null);
    if (!result.ok) return setFormError(result.error);
    adopt(result.status);
    setPartnerKey("");
    showToast({ title: "Shopee details saved", tone: "success" });
  }

  async function authorise() {
    setBusy("auth");
    setFormError(null);
    const result = await getShopeeAuthUrlAction();
    if (!result.ok) {
      setBusy(null);
      return setFormError(result.error);
    }
    window.location.href = result.url;
  }

  async function sync() {
    setBusy("sync");
    setFormError(null);
    const total = { fetched: 0, created: 0, updated: 0, skuConflicts: 0 };
    let offset = 0;
    let failed: string | null = null;

    for (let step = 0; step < MAX_STEPS; step += 1) {
      setProgress(`Syncing… ${total.fetched} products so far`);
      const result = await syncShopeeStepAction(offset);
      if (!result.ok) {
        failed = result.error;
        break;
      }
      total.fetched += result.counts.fetched;
      total.created += result.counts.created;
      total.updated += result.counts.updated;
      total.skuConflicts += result.counts.skuConflicts;
      offset = result.nextOffset;
      if (result.done) break;
    }

    const summary =
      `${total.fetched} read, ${total.created} new, ${total.updated} updated` +
      (total.skuConflicts ? `, ${total.skuConflicts} SKU clash${total.skuConflicts === 1 ? "" : "es"} skipped` : "");
    if (failed) {
      setFormError(`Sync stopped after ${summary}. ${failed}`);
    } else {
      const finished = await finishShopeeSyncAction(summary);
      if (finished.ok) setStatus(finished.status);
      showToast({ title: "Shopee sync complete", detail: summary, tone: "success" });
    }
    void refreshCatalog();
    setProgress(null);
    setBusy(null);
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Shopee? Your saved credentials are removed. Products already synced stay in Manage Products.")) return;
    setBusy("disconnect");
    const result = await disconnectShopeeAction();
    setBusy(null);
    if (!result.ok) return setFormError(result.error);
    adopt(result.status);
    showToast({ title: "Shopee disconnected", tone: "warning" });
  }

  const field =
    "w-full h-11 px-3 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary";
  const redirectUrl = typeof window === "undefined" ? "" : `${window.location.origin}/api/shopee/callback`;
  const working = busy !== null;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
      <div className="flex items-center gap-space-sm">
        <span className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0">
          <Icon name="sync_alt" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-label-lg text-label-lg text-on-surface">Shopee product sync</div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Read-only: products are pulled from Shopee into Manage Products. Nothing is ever changed or deleted on Shopee.
          </p>
        </div>
        {status ? (
          <span
            className={`font-label-sm text-label-sm px-space-sm py-1 rounded shrink-0 ${
              status.connected ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"
            }`}
          >
            {status.connected ? `Connected • shop ${status.shopId}` : status.configured ? "Needs authorisation" : "Not set up"}
          </span>
        ) : null}
      </div>

      {loadError ? (
        <div className="flex items-start gap-space-xs p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
          <Icon name="error" className="text-base shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {status ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            <select value={env} onChange={(e) => setEnv(e.target.value as ShopeeEnv)} className={field} aria-label="Environment">
              <option value="production">Production (live shop)</option>
              <option value="sandbox">Sandbox (test shop)</option>
            </select>
            <input
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value.replace(/\D/g, ""))}
              placeholder="Partner ID"
              aria-label="Partner ID"
              inputMode="numeric"
              autoComplete="off"
              className={field}
            />
            <input
              type="password"
              value={partnerKey}
              onChange={(e) => setPartnerKey(e.target.value)}
              placeholder={status.hasKey ? "Partner key saved — leave blank to keep" : "Partner key"}
              aria-label="Partner key"
              autoComplete="new-password"
              spellCheck={false}
              className={field}
            />
            <div className="grid grid-cols-3 gap-space-xs">
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Department"
                aria-label="Default department"
                className={`${field} col-span-2`}
              />
              <input
                value={departmentCode}
                onChange={(e) => setDepartmentCode(e.target.value)}
                placeholder="Code"
                aria-label="Default department code"
                className={field}
              />
            </div>
          </div>
          <label className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            New Shopee products default to
            <select
              value={taxFlag}
              onChange={(e) => setTaxFlag(e.target.value as "F" | "T")}
              aria-label="Default tax flag"
              className="h-9 px-2 bg-surface-container-low rounded-lg text-on-surface"
            >
              <option value="T">Taxable / VATable</option>
              <option value="F">Tax-exempt</option>
            </select>
            and the department above. You can change either per product afterwards — a re-sync keeps your changes.
          </label>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            In the Shopee Open Platform console, set this app&apos;s redirect URL to{" "}
            <code className="select-text">{redirectUrl}</code>. A re-sync refreshes each product&apos;s name, price, SKU and
            photo only.
          </p>
        </>
      ) : null}

      {formError ? (
        <div className="flex items-start gap-space-xs p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
          <Icon name="error" className="text-base shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}
      {status?.lastSync ? (
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Last sync {new Date(status.lastSync.at).toLocaleString()} — {status.lastSync.summary}
        </p>
      ) : null}
      {progress ? <p className="font-label-md text-label-md text-primary">{progress}</p> : null}

      {status ? (
        <div className="flex flex-wrap justify-end gap-space-xs">
          {status.configured ? (
            <button
              type="button"
              onClick={() => void disconnect()}
              disabled={working}
              className="h-11 px-space-md rounded-lg text-error hover:bg-error-container font-label-md text-label-md disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={working || !partnerId}
            className="h-11 px-space-md rounded-lg bg-surface-container text-on-surface font-label-md text-label-md disabled:opacity-50"
          >
            {busy === "save" ? "Saving…" : "Save details"}
          </button>
          <button
            type="button"
            onClick={() => void authorise()}
            disabled={working || !status.configured}
            className="h-11 px-space-md rounded-lg bg-surface-container text-on-surface font-label-md text-label-md disabled:opacity-50"
          >
            {status.connected ? "Re-authorise" : "Authorise with Shopee"}
          </button>
          <button
            type="button"
            onClick={() => void sync()}
            disabled={working || !status.connected}
            className="h-11 px-space-lg rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-50"
          >
            {busy === "sync" ? "Syncing…" : "Sync products now"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
