import type { Metadata } from "next";
import { Suspense } from "react";

import { TenderScreen } from "@/components/tender/TenderScreen";

export const metadata: Metadata = { title: "Tender & Payment • Restohub POS" };

export default function TenderPage() {
  return (
    <Suspense fallback={null}>
      <TenderScreen />
    </Suspense>
  );
}
