import { adminClient, requireManager, type AdminClient, type Failure } from "../server/admin";
import {
  ShopeeError,
  ensureFresh,
  exchangeCode,
  mapItem,
  shopeeGet,
  type ShopeeItemInfo,
  type ShopeeModel,
  type ShopeeSecret,
} from "./api";

/** Server-side logic shared by the server actions and the OAuth callback route. */

const PROVIDER = "shopee";
/** Items per sync step. Small on purpose: each step must stay under a Worker's subrequest limit. */
const PAGE_SIZE = 20;

export const DEFAULT_SHOPEE_DEFAULTS: ShopeeSecret["defaults"] = {
  department: "Grocery",
  departmentCode: "00",
  taxFlag: "T",
};

export async function guard(): Promise<Failure | { ok: true; admin: AdminClient }> {
  const caller = await requireManager();
  if (!caller.ok) return caller;
  const admin = await adminClient();
  if (!admin.ok) return admin;
  return { ok: true, admin: admin.client };
}

export async function loadSecret(admin: AdminClient): Promise<ShopeeSecret | null> {
  const { data, error } = await admin.from("integration_secrets").select("data").eq("provider", PROVIDER).maybeSingle();
  if (error) {
    if (/integration_secrets|does not exist|schema cache/i.test(error.message)) {
      throw new Error("The Shopee tables are missing. Run supabase/shopee.sql in the Supabase SQL editor.");
    }
    throw new Error(error.message);
  }
  return (data?.data as ShopeeSecret | undefined) ?? null;
}

export async function saveSecret(admin: AdminClient, secret: ShopeeSecret): Promise<void> {
  const { error } = await admin
    .from("integration_secrets")
    .upsert({ provider: PROVIDER, data: secret, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function deleteSecret(admin: AdminClient): Promise<void> {
  const { error } = await admin.from("integration_secrets").delete().eq("provider", PROVIDER);
  if (error) throw new Error(error.message);
}

/** Finishes the OAuth redirect: stores the tokens for the shop that was authorised. */
export async function completeAuthorization(code: string, shopId: string): Promise<void> {
  const g = await guard();
  if (!g.ok) throw new Error(g.error);
  const secret = await loadSecret(g.admin);
  if (!secret) throw new Error("Save your Shopee partner details first.");
  await saveSecret(g.admin, await exchangeCode(secret, code, shopId));
}

export interface SyncCounts {
  fetched: number;
  created: number;
  updated: number;
  /** Shopee SKUs dropped because another product already uses that SKU. */
  skuConflicts: number;
}

export interface SyncStep {
  done: boolean;
  nextOffset: number;
  counts: SyncCounts;
}

interface ProductRow {
  id: string;
  external_id: string;
  sku: string | null;
  image_url: string | null;
  [key: string]: unknown;
}

/**
 * Reads one page of Shopee items (GET only) and writes them to the local
 * `products` table. New items get the configured defaults; items already synced
 * only have the fields Shopee owns refreshed (name, price, SKU, photo), so a
 * manager's department / category / active edits survive every re-sync.
 */
export async function syncStep(admin: AdminClient, offset: number): Promise<SyncStep> {
  let secret = await loadSecret(admin);
  if (!secret) throw new Error("Shopee isn't set up yet.");

  const fresh = await ensureFresh(secret);
  secret = fresh.secret;
  if (fresh.refreshed) await saveSecret(admin, secret);

  const s = secret;
  const call = async <T>(path: string, params: Record<string, string | number>): Promise<T> => {
    try {
      return await shopeeGet<T>(s, path, params);
    } catch (error) {
      // An expired/rotated token mid-sync: refresh once and retry.
      if (error instanceof ShopeeError && /invalid_access_token|error_auth/.test(error.code) && s.refreshToken) {
        const { refreshAccessToken } = await import("./api");
        Object.assign(s, await refreshAccessToken(s));
        await saveSecret(admin, s);
        return shopeeGet<T>(s, path, params);
      }
      throw error;
    }
  };

  const list = await call<{ item?: { item_id: number }[]; has_next_page?: boolean; next_offset?: number }>(
    "/api/v2/product/get_item_list",
    { offset, page_size: PAGE_SIZE, item_status: "NORMAL" },
  );
  const ids = (list.item ?? []).map((i) => i.item_id);
  const counts: SyncCounts = { fetched: 0, created: 0, updated: 0, skuConflicts: 0 };
  const next = {
    done: !list.has_next_page,
    nextOffset: list.next_offset ?? offset + PAGE_SIZE,
    counts,
  };
  if (ids.length === 0) return { ...next, done: true };

  const base = await call<{ item_list?: ShopeeItemInfo[] }>("/api/v2/product/get_item_base_info", {
    item_id_list: ids.join(","),
  });

  const products = [];
  for (const item of base.item_list ?? []) {
    let models: ShopeeModel[] | null = null;
    if (item.has_model) {
      const res = await call<{ model?: ShopeeModel[] }>("/api/v2/product/get_model_list", { item_id: item.item_id });
      models = res.model ?? [];
    }
    products.push(...mapItem(item, models));
  }
  counts.fetched = products.length;
  if (products.length === 0) return next;

  const externalIds = products.map((p) => p.externalId);
  const { data: existingRows, error: existingError } = await admin
    .from("products")
    .select("*")
    .eq("source", "shopee")
    .in("external_id", externalIds);
  if (existingError) throw new Error(existingError.message);
  const existing = new Map((existingRows as ProductRow[]).map((r) => [r.external_id, r]));

  // A SKU is unique across the whole table, so one already used by a manual
  // product (or another Shopee row) is left off rather than failing the sync.
  const skus = products.map((p) => p.sku).filter((v): v is string => Boolean(v));
  const owners = new Map<string, string>();
  if (skus.length > 0) {
    const { data: skuRows, error: skuError } = await admin.from("products").select("id, sku").in("sku", skus);
    if (skuError) throw new Error(skuError.message);
    for (const r of skuRows as { id: string; sku: string }[]) owners.set(r.sku, r.id);
  }
  const claimed = new Set<string>();
  const skuFor = (sku: string | undefined, selfId: string | undefined): string | null => {
    if (!sku) return null;
    const owner = owners.get(sku);
    if ((owner && owner !== selfId) || claimed.has(sku)) {
      counts.skuConflicts += 1;
      return null;
    }
    claimed.add(sku);
    return sku;
  };

  const now = new Date().toISOString();
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];

  for (const p of products) {
    const row = existing.get(p.externalId);
    if (row) {
      // Keep a photo the manager uploaded themselves; otherwise follow Shopee.
      const ownPhoto = row.image_url?.includes("/product-images/");
      updates.push({
        ...row,
        name: p.name,
        subtitle: p.subtitle ?? null,
        unit_price_cents: p.priceCents,
        sku: row.sku ?? skuFor(p.sku, row.id),
        image_url: ownPhoto ? row.image_url : (p.imageUrl ?? null),
        last_synced_at: now,
        updated_at: now,
      });
    } else {
      inserts.push({
        name: p.name,
        subtitle: p.subtitle ?? null,
        department: s.defaults.department,
        department_code: s.defaults.departmentCode,
        pricing_mode: "count",
        unit_price_cents: p.priceCents,
        unit_label: "each",
        tax_flag: s.defaults.taxFlag,
        ebt_eligible: false,
        deposit_cents: 0,
        organic: false,
        categories: [],
        active: true,
        source: "shopee",
        external_id: p.externalId,
        sku: skuFor(p.sku, undefined),
        image_url: p.imageUrl ?? null,
        last_synced_at: now,
      });
    }
  }

  if (inserts.length > 0) {
    const { error } = await admin.from("products").insert(inserts);
    if (error) throw new Error(error.message);
    counts.created = inserts.length;
  }
  if (updates.length > 0) {
    const { error } = await admin.from("products").upsert(updates, { onConflict: "id" });
    if (error) throw new Error(error.message);
    counts.updated = updates.length;
  }
  return next;
}
