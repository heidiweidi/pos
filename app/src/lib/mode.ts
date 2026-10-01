/**
 * Demo vs Actual mode.
 *
 *  - Demo: seeded dummy catalog, cashiers, member and shift. Nothing leaves the browser.
 *  - Actual: the terminal reads and writes the store's own Supabase project —
 *    inventory, cashiers (Supabase Auth), shifts, settings.
 *
 * The choice and the connection live in two plain cookies so the server render
 * and the browser agree on them without a rebuild. The Supabase URL and anon
 * key are public by design (Row Level Security is what protects the data), so a
 * readable cookie is fine. `NEXT_PUBLIC_*` env vars remain the default when no
 * cookie has been set, which keeps existing deployments working unchanged.
 */

export const MODE_COOKIE = "restohub.pos.mode";
export const CONNECTION_COOKIE = "restohub.pos.connection";

export type PosMode = "demo" | "actual";

export interface SupabaseConnection {
  url: string;
  anonKey: string;
}

export interface Runtime {
  /** What the terminal is actually running. `actual` requires a connection. */
  mode: PosMode;
  /** The configured connection (cookie, else env), even while in demo mode. */
  connection: SupabaseConnection | null;
}

export function envConnection(): SupabaseConnection | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

/** Tolerates a missing, URL-encoded or corrupt cookie value. */
export function parseConnection(raw: string | null | undefined): SupabaseConnection | null {
  if (!raw) return null;
  for (const candidate of [raw, safeDecode(raw)]) {
    try {
      const parsed = JSON.parse(candidate) as Partial<SupabaseConnection>;
      if (typeof parsed?.url === "string" && typeof parsed?.anonKey === "string" && parsed.url && parsed.anonKey) {
        return { url: normaliseSupabaseUrl(parsed.url), anonKey: parsed.anonKey.trim() };
      }
    } catch {
      // try the next form
    }
  }
  return null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveRuntime(modeCookie: string | null | undefined, connectionCookie: string | null | undefined): Runtime {
  const connection = parseConnection(connectionCookie) ?? envConnection();
  const wanted: PosMode =
    modeCookie === "demo" || modeCookie === "actual"
      ? modeCookie
      : process.env.NEXT_PUBLIC_POS_DATA_SOURCE === "supabase"
        ? "actual"
        : "demo";
  return { mode: wanted === "actual" && connection ? "actual" : "demo", connection };
}

/**
 * Normalises what a person types into the URL box down to the bare origin.
 * Dashboard pages show URLs like `https://xxxx.supabase.co/rest/v1/`; the client
 * appends its own `/auth/v1/…` and `/rest/v1/…`, so any pasted path would make
 * Supabase answer "Invalid path specified in request URL".
 */
export function normaliseSupabaseUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return withScheme.replace(/\/+$/, "");
  }
}

/* ------------------------------------------------------------ browser side */

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

export function readClientRuntime(): Runtime {
  if (typeof document === "undefined") return resolveRuntime(null, null);
  return resolveRuntime(readCookie(MODE_COOKIE), readCookie(CONNECTION_COOKIE));
}

const ONE_YEAR = 60 * 60 * 24 * 365;

export function writeRuntimeCookies(mode: PosMode, connection?: SupabaseConnection | null): void {
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  if (connection) {
    document.cookie = `${CONNECTION_COOKIE}=${encodeURIComponent(JSON.stringify(connection))}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  }
}

export function clearConnectionCookie(): void {
  document.cookie = `${CONNECTION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
