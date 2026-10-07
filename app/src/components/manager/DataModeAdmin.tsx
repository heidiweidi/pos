"use client";

import { useState } from "react";

import { ShopeeSync } from "./ShopeeSync";
import { Icon } from "@/components/ui/Icon";
import { normaliseSupabaseUrl, readClientRuntime, writeRuntimeCookies, type SupabaseConnection } from "@/lib/mode";
import { createClient } from "@/lib/supabase/client";
import { useAddons } from "@/lib/store/addons-store";
import { useCatalog } from "@/lib/store/catalog-store";
import { useMode } from "@/lib/store/mode-store";
import { useSession } from "@/lib/store/session-store";

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "ok"; warning?: string }
  | { status: "failed"; message: string };

/** The Supabase error that means "table doesn't exist" (PostgREST / Postgres codes). */
const isMissingTable = (error: { code?: string; message?: string }) =>
  error.code === "PGRST205" || error.code === "42P01" || /could not find the table|does not exist/i.test(error.message ?? "");

/**
 * Checks a Supabase project is reachable, the key is accepted and the POS
 * schema is installed. Signed out, RLS returns zero rows rather than an error,
 * so "no error" is exactly what proves the table is there.
 */
async function testConnection(connection: SupabaseConnection): Promise<TestState> {
  try {
    const supabase = createClient(connection);

    const products = await supabase.from("products").select("id", { count: "exact", head: true });
    if (products.error) {
      if (isMissingTable(products.error)) {
        return { status: "failed", message: "Connected, but the POS tables aren't installed. Run supabase/schema.sql first." };
      }
      if (products.status === 401 || /invalid api key|jwt/i.test(products.error.message)) {
        return { status: "failed", message: "Supabase rejected the anon key. Copy it again from Project Settings → API." };
      }
      return { status: "failed", message: products.error.message };
    }

    const settings = await supabase.from("app_settings").select("key", { count: "exact", head: true });
    const warning =
      settings.error && isMissingTable(settings.error)
        ? "The settings table is missing, so add-ons and currency can't be saved yet. Run supabase/addons.sql."
        : undefined;
    return { status: "ok", warning };
  } catch (error) {
    console.error("[DataModeAdmin] connection test failed:", error);
    return { status: "failed", message: "Couldn't reach that Supabase project. Check the URL and your connection." };
  }
}

/** Manager-only: Demo vs Actual mode, and the Supabase connection behind Actual. */
export function DataModeAdmin() {
  const { cashier, signOut } = useSession();
  const mode = useMode();
  const { addons } = useAddons();
  const { products, loading, error } = useCatalog();

  const [url, setUrl] = useState(() => readClientRuntime().connection?.url ?? "");
  const [anonKey, setAnonKey] = useState(() => readClientRuntime().connection?.anonKey ?? "");
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [switching, setSwitching] = useState(false);

  if (cashier?.role !== "manager") {
    return (
      <div className="p-space-md max-w-xl mx-auto w-full">
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm text-center flex flex-col items-center gap-space-sm">
          <Icon name="lock" className="text-4xl text-outline" />
          <h1 className="font-headline-sm text-headline-sm text-on-surface">Manager access required</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Only a manager account can change the data mode.
          </p>
        </div>
      </div>
    );
  }

  const connection: SupabaseConnection = { url: normaliseSupabaseUrl(url), anonKey: anonKey.trim() };
  const canTest = url.trim().length > 0 && anonKey.trim().length > 0;

  async function runTest() {
    setTest({ status: "testing" });
    setTest(await testConnection(connection));
  }

  /** Cookies carry the choice to the server; a full reload makes every provider re-read it. */
  async function applyMode(next: "demo" | "actual") {
    setSwitching(true);
    writeRuntimeCookies(next, next === "actual" ? connection : undefined);
    try {
      await signOut();
    } finally {
      // A full reload (not a client navigation) so every server-resolved provider re-reads the new mode.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
  }

  function goActual() {
    if (test.status !== "ok") return;
    const ok = window.confirm(
      "Switch to Actual mode?\n\n" +
        "• The demo cart, member, shift and sample catalog are cleared.\n" +
        "• The register loads your Supabase inventory.\n" +
        "• Everyone is signed out — sign back in with a real Supabase account.",
    );
    if (ok) void applyMode("actual");
  }

  function goDemo() {
    const ok = window.confirm(
      "Switch back to Demo mode?\n\nThe sample catalog and demo accounts return, and everyone is signed out. Your Supabase data is not touched.",
    );
    if (ok) void applyMode("demo");
  }

  const card = "bg-surface-container-lowest rounded-xl p-space-md shadow-sm";
  const field =
    "w-full h-12 px-3 bg-surface-container-low rounded-lg font-label-lg text-label-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest shadow-inner";

  return (
    <div className="p-space-md flex flex-col gap-space-md max-w-3xl mx-auto w-full">
      <div className={card}>
        <h1 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
          <Icon name="database" className="text-primary" />
          Data Mode
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Demo mode runs on sample data and goes nowhere. Actual mode runs the store on your own Supabase project.
        </p>
      </div>

      <div className={`${card} flex items-center gap-space-md`}>
        <span
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            mode === "actual" ? "bg-primary-container text-on-primary-container" : "bg-tertiary-container text-on-tertiary-container"
          }`}
        >
          <Icon name={mode === "actual" ? "cloud_done" : "science"} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-label-lg text-label-lg text-on-surface">
            {mode === "actual" ? "Actual mode" : "Demo mode"}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
            {mode === "actual"
              ? `Connected to ${safeHost(readClientRuntime().connection?.url)} • ${
                  loading ? "loading inventory…" : error ? error : `${products.length} products in inventory`
                }`
              : "Sample catalog, demo accounts and a seeded sale."}
          </p>
        </div>
      </div>

      {mode === "demo" ? (
        <div className={`${card} flex flex-col gap-space-sm`}>
          <span className="font-label-lg text-label-lg text-on-surface">Connect to Supabase</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            From your Supabase dashboard → Project Settings → API. The project needs{" "}
            <code>supabase/schema.sql</code> run, products loaded, and a Supabase user per cashier.
          </p>
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setTest({ status: "idle" });
            }}
            className={field}
            placeholder="Project URL — https://xxxx.supabase.co"
            aria-label="Supabase project URL"
            inputMode="url"
            autoComplete="off"
          />
          <input
            value={anonKey}
            onChange={(e) => {
              setAnonKey(e.target.value);
              setTest({ status: "idle" });
            }}
            className={field}
            placeholder="anon / public key"
            aria-label="Supabase anon key"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Use the anon (public) key only — never the service-role key. Row Level Security is what protects your data.
          </p>

          {test.status === "failed" ? (
            <div className="flex items-start gap-space-xs p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
              <Icon name="error" className="text-base shrink-0" />
              <span>{test.message}</span>
            </div>
          ) : null}
          {test.status === "ok" ? (
            <div className="flex items-start gap-space-xs p-space-sm rounded-lg bg-primary-container text-on-primary-container font-body-sm text-body-sm">
              <Icon name="check_circle" className="text-base shrink-0" />
              <span>
                Connected — POS schema found.
                {test.warning ? ` ${test.warning}` : ""}
              </span>
            </div>
          ) : null}

          <div className="flex justify-end gap-space-xs">
            <button
              type="button"
              onClick={() => void runTest()}
              disabled={!canTest || test.status === "testing" || switching}
              className="h-12 px-space-md rounded-lg bg-surface-container text-on-surface font-label-md text-label-md disabled:opacity-50"
            >
              {test.status === "testing" ? "Testing…" : "Test connection"}
            </button>
            <button
              type="button"
              onClick={goActual}
              disabled={test.status !== "ok" || switching}
              className="h-12 px-space-lg rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-50"
            >
              Switch to Actual mode
            </button>
          </div>
        </div>
      ) : (
        <div className={`${card} flex flex-col gap-space-sm`}>
          <span className="font-label-lg text-label-lg text-on-surface">Back to demo</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Returns to the sample catalog and demo accounts. Nothing in your Supabase project is changed.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={goDemo}
              disabled={switching}
              className="h-12 px-space-lg rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg disabled:opacity-50"
            >
              Switch to Demo mode
            </button>
          </div>
        </div>
      )}

      {addons.shopee ? (
        mode === "actual" ? (
          <ShopeeSync />
        ) : (
          <div className={`${card} flex items-center gap-space-sm`}>
            <Icon name="sync_alt" className="text-outline" />
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              The Shopee Product Sync add-on is on. Switch to Actual mode to connect Shopee — synced products are stored in your
              Supabase inventory.
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}

function safeHost(url: string | undefined): string {
  try {
    return url ? new URL(url).host : "Supabase";
  } catch {
    return "Supabase";
  }
}
