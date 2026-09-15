import { CASHIERS } from "@/lib/data/session";
import { PosProvider } from "@/lib/store/pos-store";
import { SessionProvider } from "@/lib/store/session-store";
import { PosShell } from "@/components/shell/PosShell";

/**
 * Everything behind the sign-in gate shares one cart, one session and one shell.
 *
 * The cashier roster is read on the server (a Supabase query in phase 2) and
 * handed to the client provider, so the lock screen can validate a handover PIN
 * without another round trip.
 */
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider cashiers={CASHIERS}>
      <PosProvider>
        <PosShell>{children}</PosShell>
      </PosProvider>
    </SessionProvider>
  );
}
