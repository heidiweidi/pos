import type { Metadata } from "next";

import { StaffAdmin } from "@/components/manager/StaffAdmin";

export const metadata: Metadata = { title: "Staff • Restohub POS" };

export default function StaffPage() {
  return <StaffAdmin />;
}
