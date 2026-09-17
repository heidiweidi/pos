import type { Metadata } from "next";

import { ProductsAdmin } from "@/components/manager/ProductsAdmin";

export const metadata: Metadata = { title: "Manage Products • Restohub POS" };

export default function ManageProductsPage() {
  return <ProductsAdmin />;
}
