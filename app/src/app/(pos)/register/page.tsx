import type { Metadata } from "next";

import { RegisterScreen } from "@/components/register/RegisterScreen";

export const metadata: Metadata = { title: "Active Register • Restohub POS" };

export default function RegisterPage() {
  return <RegisterScreen />;
}
