import { parseRegion, type RegionSettings } from "../region";
import { createClient } from "../supabase/client";

/**
 * Persists the currency / tax settings — same storage story as addons-admin.ts:
 * one `app_settings` row (key = "region") on Supabase, manager-write via RLS;
 * localStorage in mock mode.
 */

const LOCAL_KEY = "restohub.pos.region";

export function readLocalRegion(): RegionSettings | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? parseRegion(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function saveRegion(next: RegionSettings, isSupabase: boolean): Promise<void> {
  if (!isSupabase) {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: the change still applies until reload.
    }
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "region", value: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}
