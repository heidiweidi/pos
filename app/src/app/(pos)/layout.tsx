import { getDataAdapter } from "@/lib/data";
import { PosProvider } from "@/lib/store/pos-store";
import { SessionProvider } from "@/lib/store/session-store";
import { PosShell } from "@/components/shell/PosShell";

/**
 * Everything behind the sign-in gate shares one cart, one session and one shell.
 *
 * The cashier roster is read on the server — the mock adapter's static list in
 * phase 1, a Supabase query scoped by RLS to the signed-in cashier in phase 2 —
 * and handed to the client provider, so the lock screen can validate a
 * handover PIN without another round trip.
 */
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const cashiers = await getDataAdapter().listCashiers();
  return (
    <SessionProvider cashiers={cashiers}>
      <PosProvider>
        <PosShell>{children}</PosShell>
      </PosProvider>
    </SessionProvider>
  );
}
