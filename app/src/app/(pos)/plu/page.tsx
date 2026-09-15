import type { Metadata } from "next";
import { Suspense } from "react";

import { PluScreen } from "@/components/plu/PluScreen";

export const metadata: Metadata = { title: "Produce PLU Lookup • Restohub POS" };

export default function PluPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <PluScreen />
    </Suspense>
  );
}
