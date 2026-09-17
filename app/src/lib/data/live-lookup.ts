import { createClient } from "../supabase/client";
import type { Department, PricingMode, Product, TaxFlag } from "../types";

/** Row shape as stored in Postgres (snake_case). */
interface LiveProductRow {
  id: string;
  plu: string | null;
  upc: string | null;
  sku: string | null;
  name: string;
  subtitle: string | null;
  department: string;
  department_code: string;
  pricing_mode: string;
  unit_price_cents: number;
  unit_label: string;
  tax_flag: string;
  ebt_eligible: boolean;
  deposit_cents: number;
  organic: boolean;
  art: string | null;
  icon: string | null;
  icon_class: string | null;
  promo_label: string | null;
  categories: string[] | null;
}

function mapRow(row: LiveProductRow): Product {
  return {
    id: row.id,
    plu: row.plu ?? undefined,
    upc: row.upc ?? undefined,
    sku: row.sku ?? undefined,
    name: row.name,
    subtitle: row.subtitle ?? undefined,
    department: row.department as Department,
    departmentCode: row.department_code,
    pricingMode: row.pricing_mode as PricingMode,
    unitPrice: row.unit_price_cents,
    unitLabel: row.unit_label as "lb" | "each",
    taxFlag: row.tax_flag as TaxFlag,
    ebtEligible: row.ebt_eligible,
    depositCents: row.deposit_cents || undefined,
    organic: row.organic || undefined,
    art: row.art ?? undefined,
    icon: row.icon ?? undefined,
    iconClass: row.icon_class ?? undefined,
    promoLabel: row.promo_label ?? undefined,
    categories: row.categories ?? undefined,
  };
}

/**
 * Browser-side fallback lookup against the live Supabase catalog.
 *
 * The register's scan/PLU-entry dock checks the phase-1 demo catalog
 * (lib/data/catalog.ts) first — it's synchronous and covers the seeded fast
 * keys — then falls back here for anything added later through the Manage
 * Products admin screen, which only ever writes to Supabase. RLS's
 * "staff read products" policy lets any signed-in cashier read this table,
 * so it's safe to query straight from the client, the same way the admin
 * screen's own reads do.
 *
 * Resolves to null (never throws) when Supabase isn't the active data
 * source or the lookup fails, so dev/mock-mode and network hiccups both
 * degrade to "no match" rather than breaking the scan dock.
 */
export async function findProductByCodeLive(code: string): Promise<Product | null> {
  if (process.env.NEXT_PUBLIC_POS_DATA_SOURCE !== "supabase") return null;
  const q = code.trim();
  if (!q) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .or(`plu.eq.${q},upc.eq.${q},sku.eq.${q}`)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as LiveProductRow);
  } catch (error) {
    console.error("[live-lookup] findProductByCodeLive failed:", error);
    return null;
  }
}
