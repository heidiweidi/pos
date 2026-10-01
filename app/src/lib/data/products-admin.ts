import { createClient } from "../supabase/client";
import type { Department, PricingMode, TaxFlag } from "../types";

/**
 * Product management for the "Manage Products" screen.
 *
 * This talks to Supabase directly from the browser (RLS enforces that only a
 * signed-in `manager` can write — see the "managers write products" policy in
 * supabase/schema.sql), the same pattern `supabase-auth.ts` uses for sign-in.
 * It's deliberately separate from `PosDataAdapter`: that interface is the
 * read seam the register/PLU screens consume, and only has a server-side
 * Supabase implementation. This module is the admin write path, browser-side,
 * and only works when NEXT_PUBLIC_POS_DATA_SOURCE=supabase.
 */

/** Row shape as stored in Postgres (snake_case). Unlike the read-only
 *  adapter's `listProducts()` (which filters to `active = true`), the admin
 *  screen needs every row so a manager can see and reactivate hidden items. */
export interface ProductAdminRow {
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
  categories: string[] | null;
  active: boolean;
  updated_at: string;
}

export interface ProductFormInput {
  name: string;
  subtitle: string;
  department: Department;
  departmentCode: string;
  pricingMode: PricingMode;
  unitLabel: "lb" | "each";
  unitPriceCents: number;
  taxFlag: TaxFlag;
  ebtEligible: boolean;
  depositCents: number;
  organic: boolean;
  plu: string;
  upc: string;
  sku: string;
  categories: string[];
}

function toRow(input: ProductFormInput) {
  return {
    name: input.name.trim(),
    subtitle: input.subtitle.trim() || null,
    department: input.department,
    department_code: input.departmentCode.trim(),
    pricing_mode: input.pricingMode,
    unit_label: input.unitLabel,
    unit_price_cents: input.unitPriceCents,
    tax_flag: input.taxFlag,
    ebt_eligible: input.ebtEligible,
    deposit_cents: input.depositCents,
    organic: input.organic,
    // Empty string -> null so the unique constraints on plu/upc/sku don't
    // collide across products that simply don't use that code type.
    plu: input.plu.trim() || null,
    upc: input.upc.trim() || null,
    sku: input.sku.trim() || null,
    categories: input.categories,
  };
}

export async function listAllProducts(): Promise<ProductAdminRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").select("*").order("department").order("name");
  if (error) throw error;
  return data as ProductAdminRow[];
}

export async function createProduct(input: ProductFormInput): Promise<ProductAdminRow> {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").insert(toRow(input)).select("*").single();
  if (error) throw error;
  return data as ProductAdminRow;
}

export async function updateProduct(id: string, input: ProductFormInput): Promise<ProductAdminRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProductAdminRow;
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/** How a bulk edit changes each product's category list. */
export type CategoryEdit = { mode: "add" | "remove" | "replace"; values: string[] };

export interface BulkPatch {
  department?: Department;
  /** Only sent together with a department change, when the manager supplies one. */
  departmentCode?: string;
  active?: boolean;
  categories?: CategoryEdit;
}

/** Lower-case, trimmed, spaces to dashes — matches the seeded slugs ("self-serve"). */
export function normaliseCategory(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}

function applyCategoryEdit(current: string[], edit: CategoryEdit): string[] {
  if (edit.mode === "replace") return [...new Set(edit.values)];
  if (edit.mode === "add") return [...new Set([...current, ...edit.values])];
  return current.filter((c) => !edit.values.includes(c));
}

/**
 * Applies one change to many products. Department / status are a single
 * `update ... where id in (...)`. Category add/remove depends on each product's
 * current list, so products are grouped by their resulting list and each group
 * is one update — a typical bulk edit is one or two round trips, not one per row.
 * Returns the rows as they now stand.
 */
export async function bulkUpdateProducts(rows: ProductAdminRow[], patch: BulkPatch): Promise<ProductAdminRow[]> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const base: Record<string, unknown> = { updated_at: now };
  if (patch.department) base.department = patch.department;
  if (patch.department && patch.departmentCode?.trim()) base.department_code = patch.departmentCode.trim();
  if (patch.active !== undefined) base.active = patch.active;

  // Group by the category list each row ends up with (or one group if untouched).
  const groups = new Map<string, { ids: string[]; categories?: string[] }>();
  for (const row of rows) {
    const next = patch.categories ? applyCategoryEdit(row.categories ?? [], patch.categories) : undefined;
    const key = next ? JSON.stringify([...next].sort()) : "-";
    const group = groups.get(key) ?? { ids: [], categories: next };
    group.ids.push(row.id);
    groups.set(key, group);
  }

  const updated: ProductAdminRow[] = [];
  for (const group of groups.values()) {
    const update = group.categories ? { ...base, categories: group.categories } : base;
    const { data, error } = await supabase.from("products").update(update).in("id", group.ids).select("*");
    if (error) throw error;
    updated.push(...(data as ProductAdminRow[]));
  }
  return updated;
}
