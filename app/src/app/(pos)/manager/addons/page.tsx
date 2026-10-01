import type { Metadata } from "next";

import { AddonsAdmin } from "@/components/manager/AddonsAdmin";

export const metadata: Metadata = { title: "Add-ons • Restohub POS" };

export default function AddonsPage() {
  return <AddonsAdmin />;
}
