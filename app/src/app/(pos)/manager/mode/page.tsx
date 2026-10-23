import type { Metadata } from "next";

import { DataModeAdmin } from "@/components/manager/DataModeAdmin";

export const metadata: Metadata = { title: "Data Mode • Restohub POS" };

export default function DataModePage() {
  return <DataModeAdmin />;
}
