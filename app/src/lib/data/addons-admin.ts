import { ADDON_IDS, parseAddons, type AddonState } from "../addons";
import { createClient } from "../supabase/client";

/**
 * Persists the add-on switches.
 *
 * With Supabase this is a single `app_settings` row (key = "addons"); RLS lets
 * only a signed-in manager write it — see supabase/addons.sql. In mock mode the
 * switches live in this browser's localStorage so the demo is still usable.
 */

const LOCAL_KEY = "restohub.pos.addons";

export function readLocalAddons(): AddonState | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? parseAddons(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function saveAddons(next: AddonState, isSupabase: boolean): Promise<void> {
  const value = Object.fromEntries(ADDON_IDS.map((id) => [id, next[id]]));

  if (!isSupabase) {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
    } catch {
      // Storage unavailable: the switch still applies until reload.
    }
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "addons", value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
