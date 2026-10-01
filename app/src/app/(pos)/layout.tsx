import { getDataAdapter } from "@/lib/data";
import { DEFAULT_ADDONS } from "@/lib/addons";
import { getRuntime } from "@/lib/mode-server";
import { DEFAULT_REGION } from "@/lib/region";
import { AddonsProvider } from "@/lib/store/addons-store";
import { CatalogProvider } from "@/lib/store/catalog-store";
import { ModeProvider } from "@/lib/store/mode-store";
import { PosProvider } from "@/lib/store/pos-store";
import { RegionProvider } from "@/lib/store/region-store";
import { SessionProvider } from "@/lib/store/session-store";
import { PosShell } from "@/components/shell/PosShell";

/**
 * Everything behind the sign-in gate shares one cart, one session and one shell.
 *
 * The cashier roster is read on the server — the mock adapter's static list in
 * demo mode, a Supabase query scoped by RLS to the signed-in cashier in actual
 * mode — and handed to the client provider, so the lock screen can validate a
 * handover PIN without another round trip.
 *
 * A misconfigured or unreachable Supabase project must never take the whole
 * terminal down, so each read falls back to a safe default instead of throwing.
 */
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const [{ mode }, adapter] = await Promise.all([getRuntime(), getDataAdapter()]);

  const [cashiers, addons, region] = await Promise.all([
    adapter.listCashiers().catch((error) => {
      console.error("[PosLayout] listCashiers failed, falling back to []:", error);
      return [];
    }),
    adapter.getAddons().catch((error) => {
      console.error("[PosLayout] getAddons failed, falling back to all off:", error);
      return DEFAULT_ADDONS;
    }),
    adapter.getRegion().catch((error) => {
      console.error("[PosLayout] getRegion failed, falling back to defaults:", error);
      return DEFAULT_REGION;
    }),
  ]);

  return (
    <ModeProvider mode={mode}>
      <SessionProvider cashiers={cashiers}>
        <RegionProvider initial={region}>
          <AddonsProvider initial={addons}>
            <CatalogProvider>
              <PosProvider>
                <PosShell>{children}</PosShell>
              </PosProvider>
            </CatalogProvider>
          </AddonsProvider>
        </RegionProvider>
      </SessionProvider>
    </ModeProvider>
  );
}
