import type { Metadata } from "next";

import { ManagerScreen } from "@/components/manager/ManagerScreen";

export const metadata: Metadata = { title: "Manager & Shift • Restohub POS" };

export default function ManagerPage() {
  return <ManagerScreen />;
}
