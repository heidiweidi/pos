import type { Metadata } from "next";

import { LoginScreen } from "@/components/auth/LoginScreen";
import { getDataAdapter } from "@/lib/data";
import { getRuntime } from "@/lib/mode-server";
import { ModeProvider } from "@/lib/store/mode-store";
import { SessionProvider } from "@/lib/store/session-store";

export const metadata: Metadata = { title: "Sign in • Restohub POS" };

export default async function LoginPage() {
  // Anonymous on Supabase (RLS hides the roster pre-sign-in) — harmless here,
  // since signIn() hits Supabase Auth directly rather than consulting this
  // list. Also never let a misconfigured/unreachable project crash the page.
  const [{ mode }, adapter] = await Promise.all([getRuntime(), getDataAdapter()]);
  const cashiers = await adapter
    .listCashiers()
    .catch((error) => {
      console.error("[LoginPage] listCashiers failed, falling back to []:", error);
      return [];
    });
  return (
    <ModeProvider mode={mode}>
      <SessionProvider cashiers={cashiers}>
        <LoginScreen />
      </SessionProvider>
    </ModeProvider>
  );
}
