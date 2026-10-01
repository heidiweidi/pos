import type { Metadata } from "next";

import { RegionAdmin } from "@/components/manager/RegionAdmin";

export const metadata: Metadata = { title: "Currency & Tax • Restohub POS" };

export default function RegionPage() {
  return <RegionAdmin />;
}
