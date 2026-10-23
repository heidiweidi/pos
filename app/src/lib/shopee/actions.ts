"use server";

import { headers } from "next/headers";

import { buildAuthUrl, ShopeeError, type ShopeeEnv, type ShopeeSecret } from "./api";
import {
  DEFAULT_SHOPEE_DEFAULTS,
  deleteSecret,
  guard,
  loadSecret,
  saveSecret,
  syncStep,
  type SyncCounts,
} from "./service";

/**
 * Manager-only Shopee actions. Credentials live in a server-only table and are
 * never sent to the browser — `ShopeeStatus` carries only non-secret facts.
 */

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

export interface ShopeeStatus {
  configured: boolean;
  connected: boolean;
  env: ShopeeEnv;
  partnerId: string;
  hasKey: boolean;
  shopId: string | null;
  defaults: ShopeeSecret["defaults"];
  lastSync: ShopeeSecret["lastSync"] | null;
}

const TAX_FLAGS = ["F", "T"] as const;

const message = (error: unknown) => {
  if (error instanceof ShopeeError) return `Shopee said: ${error.message}`;
  if (!(error instanceof Error)) return "Something went wrong.";
  // A column added by a newer shopee.sql that hasn't been re-run yet.
  if (/stock_qty|source|external_id|last_synced_at/.test(error.message) && /column|schema cache/i.test(error.message)) {
    return "The database is missing a column — run supabase/shopee.sql again in the Supabase SQL editor (it's safe to re-run).";
  }
  return error.message;
};

function toStatus(secret: ShopeeSecret | null): ShopeeStatus {
  return {
    configured: Boolean(secret?.partnerId && secret.partnerKey),
    connected: Boolean(secret?.accessToken && secret.shopId),
    env: secret?.env ?? "production",
    partnerId: secret?.partnerId ?? "",
    hasKey: Boolean(secret?.partnerKey),
    shopId: secret?.shopId ?? null,
    defaults: secret?.defaults ?? DEFAULT_SHOPEE_DEFAULTS,
    lastSync: secret?.lastSync ?? null,
  };
}

export async function getShopeeStatusAction(): Promise<Result<{ status: ShopeeStatus }>> {
  const g = await guard();
  if (!g.ok) return g;
  try {
    return { ok: true, status: toStatus(await loadSecret(g.admin)) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export interface ShopeeConfigInput {
  env: ShopeeEnv;
  partnerId: string;
  /** Blank keeps the saved key. */
  partnerKey: string;
  defaults: ShopeeSecret["defaults"];
}

export async function saveShopeeConfigAction(input: ShopeeConfigInput): Promise<Result<{ status: ShopeeStatus }>> {
  const partnerId = input.partnerId.trim();
  const partnerKey = input.partnerKey.trim();
  const { department, departmentCode, taxFlag } = input.defaults;

  if (!["production", "sandbox"].includes(input.env)) return { ok: false, error: "Choose an environment." };
  if (!/^\d{3,12}$/.test(partnerId)) return { ok: false, error: "Partner ID is the number from your Shopee app." };
  if (!department.trim() || !departmentCode.trim()) return { ok: false, error: "Enter a default department and code." };
  if (!TAX_FLAGS.includes(taxFlag)) return { ok: false, error: "Choose a default tax flag." };

  const g = await guard();
  if (!g.ok) return g;
  try {
    const previous = await loadSecret(g.admin);
    const key = partnerKey || previous?.partnerKey;
    if (!key) return { ok: false, error: "Enter the partner key from your Shopee app." };

    // New credentials invalidate the old authorisation, so tokens are dropped.
    const sameApp = previous && previous.partnerId === partnerId && previous.partnerKey === key && previous.env === input.env;
    const next: ShopeeSecret = {
      env: input.env,
      partnerId,
      partnerKey: key,
      defaults: { department: department.trim(), departmentCode: departmentCode.trim(), taxFlag },
      ...(sameApp
        ? {
            shopId: previous.shopId,
            accessToken: previous.accessToken,
            refreshToken: previous.refreshToken,
            accessExpiresAt: previous.accessExpiresAt,
            lastSync: previous.lastSync,
          }
        : {}),
    };
    await saveSecret(g.admin, next);
    return { ok: true, status: toStatus(next) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

/** Where to send the manager so they can authorise this app on their Shopee shop. */
export async function getShopeeAuthUrlAction(): Promise<Result<{ url: string; redirect: string }>> {
  const g = await guard();
  if (!g.ok) return g;
  try {
    const secret = await loadSecret(g.admin);
    if (!secret) return { ok: false, error: "Save your Shopee partner details first." };

    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    const redirect = `${proto}://${host}/api/shopee/callback`;
    return { ok: true, url: await buildAuthUrl(secret, redirect), redirect };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export type SyncStepResult = Result<{ done: boolean; nextOffset: number; counts: SyncCounts }>;

/** One page of the sync (read-only against Shopee). The browser loops until `done`. */
export async function syncShopeeStepAction(offset: number): Promise<SyncStepResult> {
  const g = await guard();
  if (!g.ok) return g;
  try {
    const step = await syncStep(g.admin, offset);
    return { ok: true, ...step };
  } catch (error) {
    console.error("[shopee] sync step failed:", error);
    return { ok: false, error: message(error) };
  }
}

export async function finishShopeeSyncAction(summary: string): Promise<Result<{ status: ShopeeStatus }>> {
  const g = await guard();
  if (!g.ok) return g;
  try {
    const secret = await loadSecret(g.admin);
    if (!secret) return { ok: false, error: "Shopee isn't set up." };
    const next = { ...secret, lastSync: { at: new Date().toISOString(), summary } };
    await saveSecret(g.admin, next);
    return { ok: true, status: toStatus(next) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

/** Forgets the credentials. Products already synced stay in Manage Products. */
export async function disconnectShopeeAction(): Promise<Result<{ status: ShopeeStatus }>> {
  const g = await guard();
  if (!g.ok) return g;
  try {
    await deleteSecret(g.admin);
    return { ok: true, status: toStatus(null) };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
