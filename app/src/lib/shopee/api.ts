/**
 * Minimal Shopee Open Platform v2 client — server-only.
 *
 * The product sync only ever issues GET requests for product data. The two POSTs
 * here (`token/get`, `access_token/get`) are the OAuth token exchange, which
 * mints credentials and touches no shop data.
 *
 * Request signing (HMAC-SHA256 hex, keyed by the partner key):
 *   public/auth calls : partner_id + path + timestamp
 *   shop calls        : partner_id + path + timestamp + access_token + shop_id
 */

export type ShopeeEnv = "production" | "sandbox";

export const SHOPEE_HOSTS: Record<ShopeeEnv, string> = {
  production: "https://partner.shopeemobile.com",
  sandbox: "https://partner.test-stable.shopeemobile.com",
};

export interface ShopeeSecret {
  env: ShopeeEnv;
  partnerId: string;
  partnerKey: string;
  shopId?: string;
  accessToken?: string;
  refreshToken?: string;
  /** Epoch ms. Shopee access tokens last about 4 hours. */
  accessExpiresAt?: number;
  /** Fields Shopee has no concept of, applied to newly synced products. */
  defaults: { department: string; departmentCode: string; taxFlag: "F" | "T" };
  lastSync?: { at: string; summary: string };
}

export class ShopeeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message ? `${code}: ${message}` : code);
  }
}

export async function sign(key: string, base: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(base));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const now = () => Math.floor(Date.now() / 1000);

async function parse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ShopeeError(`http_${res.status}`, "Shopee returned a non-JSON response.");
  }
  if (typeof json.error === "string" && json.error) {
    throw new ShopeeError(json.error, typeof json.message === "string" ? json.message : "");
  }
  return json;
}

/** The URL a manager is sent to so they can authorise this app on their shop. */
export async function buildAuthUrl(secret: ShopeeSecret, redirect: string): Promise<string> {
  const path = "/api/v2/shop/auth_partner";
  const timestamp = now();
  const signature = await sign(secret.partnerKey, `${secret.partnerId}${path}${timestamp}`);
  const query = new URLSearchParams({
    partner_id: secret.partnerId,
    timestamp: String(timestamp),
    sign: signature,
    redirect,
  });
  return `${SHOPEE_HOSTS[secret.env]}${path}?${query}`;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expire_in?: number;
}

async function tokenCall(secret: ShopeeSecret, path: string, body: Record<string, unknown>): Promise<TokenResponse> {
  const timestamp = now();
  const signature = await sign(secret.partnerKey, `${secret.partnerId}${path}${timestamp}`);
  const query = new URLSearchParams({ partner_id: secret.partnerId, timestamp: String(timestamp), sign: signature });
  const res = await fetch(`${SHOPEE_HOSTS[secret.env]}${path}?${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, partner_id: Number(secret.partnerId) }),
  });
  return (await parse(res)) as TokenResponse;
}

function withTokens(secret: ShopeeSecret, t: TokenResponse, shopId?: string): ShopeeSecret {
  if (!t.access_token || !t.refresh_token) throw new ShopeeError("no_token", "Shopee didn't return tokens.");
  return {
    ...secret,
    shopId: shopId ?? secret.shopId,
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    accessExpiresAt: Date.now() + (t.expire_in ?? 14_400) * 1000,
  };
}

/** Trades the one-time `code` from the authorisation redirect for tokens. */
export async function exchangeCode(secret: ShopeeSecret, code: string, shopId: string): Promise<ShopeeSecret> {
  const t = await tokenCall(secret, "/api/v2/auth/token/get", { code, shop_id: Number(shopId) });
  return withTokens(secret, t, shopId);
}

export async function refreshAccessToken(secret: ShopeeSecret): Promise<ShopeeSecret> {
  if (!secret.refreshToken || !secret.shopId) throw new ShopeeError("not_connected", "Authorise with Shopee first.");
  const t = await tokenCall(secret, "/api/v2/auth/access_token/get", {
    refresh_token: secret.refreshToken,
    shop_id: Number(secret.shopId),
  });
  return withTokens(secret, t);
}

/** A still-valid access token, refreshing it (and returning the updated secret) when near expiry. */
export async function ensureFresh(secret: ShopeeSecret): Promise<{ secret: ShopeeSecret; refreshed: boolean }> {
  if (!secret.accessToken || !secret.shopId) throw new ShopeeError("not_connected", "Authorise with Shopee first.");
  const soon = Date.now() + 5 * 60 * 1000;
  if (secret.accessExpiresAt && secret.accessExpiresAt > soon) return { secret, refreshed: false };
  return { secret: await refreshAccessToken(secret), refreshed: true };
}

/** A signed GET to a shop-level endpoint. Returns Shopee's `response` object. */
export async function shopeeGet<T = Record<string, unknown>>(
  secret: ShopeeSecret,
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  if (!secret.accessToken || !secret.shopId) throw new ShopeeError("not_connected", "Authorise with Shopee first.");
  const timestamp = now();
  const signature = await sign(
    secret.partnerKey,
    `${secret.partnerId}${path}${timestamp}${secret.accessToken}${secret.shopId}`,
  );
  const query = new URLSearchParams({
    partner_id: secret.partnerId,
    timestamp: String(timestamp),
    access_token: secret.accessToken,
    shop_id: secret.shopId,
    sign: signature,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${SHOPEE_HOSTS[secret.env]}${path}?${query}`, { method: "GET" });
  const json = await parse(res);
  return (json.response ?? {}) as T;
}

/* ------------------------------------------------------------- product map */

export interface ShopeeProduct {
  /** `item_id` or `item_id:model_id` — the stable key used to re-sync the same row. */
  externalId: string;
  name: string;
  /** Variation name, when the item has variations. */
  subtitle?: string;
  sku?: string;
  priceCents: number;
  /** Units available on Shopee right now; undefined when Shopee didn't report it. */
  stock?: number;
  imageUrl?: string;
}

interface StockFields {
  stock_info_v2?: { summary_info?: { total_available_stock?: number } };
  stock_info?: { current_stock?: number }[];
  stock?: number;
}

interface PriceInfo {
  current_price?: number;
}
export interface ShopeeItemInfo extends StockFields {
  item_id: number;
  item_name?: string;
  item_sku?: string;
  has_model?: boolean;
  item_status?: string;
  price_info?: PriceInfo[];
  image?: { image_url_list?: string[] };
}
export interface ShopeeModel extends StockFields {
  model_id: number;
  model_sku?: string;
  model_name?: string;
  price_info?: PriceInfo[];
}

/** Newest field first: v2 summary, then the older per-location list, then the legacy scalar. */
function stockOf(x: StockFields): number | undefined {
  const n = x.stock_info_v2?.summary_info?.total_available_stock ?? x.stock_info?.[0]?.current_stock ?? x.stock;
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : undefined;
}

const toCents = (price: number | undefined): number => Math.max(0, Math.round((price ?? 0) * 100));

/** One local product per sellable thing: the item, or each of its variations. */
export function mapItem(item: ShopeeItemInfo, models: ShopeeModel[] | null): ShopeeProduct[] {
  const name = (item.item_name ?? "").trim() || `Shopee item ${item.item_id}`;
  const imageUrl = item.image?.image_url_list?.[0];

  if (models && models.length > 0) {
    return models.map((m) => ({
      externalId: `${item.item_id}:${m.model_id}`,
      name,
      subtitle: m.model_name?.trim() || undefined,
      sku: m.model_sku?.trim() || undefined,
      priceCents: toCents(m.price_info?.[0]?.current_price),
      stock: stockOf(m),
      imageUrl,
    }));
  }
  return [
    {
      externalId: String(item.item_id),
      name,
      sku: item.item_sku?.trim() || undefined,
      priceCents: toCents(item.price_info?.[0]?.current_price),
      stock: stockOf(item),
      imageUrl,
    },
  ];
}
