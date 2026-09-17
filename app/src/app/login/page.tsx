import type { Metadata } from "next";

import { LoginScreen } from "@/components/auth/LoginScreen";
import { getDataAdapter } from "@/lib/data";
import { SessionProvider } from "@/lib/store/session-store";

export const metadata: Metadata = { title: "Sign in • Restohub POS" };

export default async function LoginPage() {
  // Anonymous on Supabase (RLS hides the roster pre-sign-in) — harmless here,
  // since signIn() hits Supabase Auth directly rather than consulting this list.
  const cashiers = await getDataAdapter().listCashiers();
  return (
    <SessionProvider cashiers={cashiers}>
      <LoginScreen />
    </SessionProvider>
  );
}
