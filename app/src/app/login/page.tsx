import type { Metadata } from "next";

import { LoginScreen } from "@/components/auth/LoginScreen";
import { CASHIERS } from "@/lib/data/session";
import { SessionProvider } from "@/lib/store/session-store";

export const metadata: Metadata = { title: "Sign in • Restohub POS" };

export default function LoginPage() {
  return (
    <SessionProvider cashiers={CASHIERS}>
      <LoginScreen />
    </SessionProvider>
  );
}
