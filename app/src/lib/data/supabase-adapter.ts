import { createClient } from "../supabase/server";
import { computeTotals } from "../money";
import type { PosDataAdapter } from "./adapter";
import type {
  CartLine,
  Cashier,
  Department,
  LoyaltyMember,
  OverrideLogEntry,
  PricingMode,
  Product,
  SafeDrop,
  ShiftSummary,
  TaxFlag,
} from "../types";

/** Row shapes as they come back from Postgres (snake_case). */
interface ProductRow {
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

interface CashierRow {
  id: string;
  badge: string;
  full_name: string;
  email: string;
  role: "cashier" | "supervisor" | "manager";
}

interface MemberRow {
  id: string;
  account_number: string;
  full_name: string;
  tier: string;
  points: number;
  reward_cents: number;
  email: string | null;
  phone: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function mapProduct(row: ProductRow): Product {
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

function mapMember(row: MemberRow): LoyaltyMember {
  const tier: LoyaltyMember["tier"] =
    row.tier === "Gold" || row.tier === "Silver" ? row.tier : "Member";
  return {
    id: row.id,
    accountNumber: row.account_number,
    name: row.full_name,
    tier,
    points: row.points,
    rewardAvailable: row.reward_cents,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    couponsApplied: [],
  };
}

async function mapCashier(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: CashierRow,
): Promise<Cashier> {
  const { data: shift } = await supabase
    .from("shifts")
    .select("id, started_at, ended_at")
    .eq("cashier_id", row.id)
    .eq("status", "open")
    .maybeSingle();

  return {
    id: row.id,
    name: row.full_name,
    badge: row.badge,
    role: row.role,
    // Never shipped to the browser — real PIN checks go through the
    // verify_cashier_pin_by_id RPC, never a client-side string compare.
    pin: "",
    email: row.email,
    shiftId: shift?.id ?? "",
    shiftStart: formatTime(shift?.started_at ?? null),
    shiftEnd: formatTime(shift?.ended_at ?? null),
  };
}

/**
 * Phase 2 adapter — implements `PosDataAdapter` against the live Postgres
 * schema in `supabase/schema.sql`. Uses the server-side Supabase client (reads
 * the request's auth cookie), so every call is scoped by RLS to what the
 * signed-in cashier is allowed to see. Only safe to call from server code
 * (Server Components, Route Handlers) — not from "use client" modules.
 */
export const supabaseAdapter: PosDataAdapter = {
  name: "supabase",

  async listProducts(): Promise<Product[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("department")
      .order("name");
    if (error) throw error;
    return (data as ProductRow[]).map(mapProduct);
  },

  async findProductByCode(code): Promise<Product | null> {
    const q = code.trim();
    if (!q) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .or(`plu.eq.${q},upc.eq.${q},sku.eq.${q}`)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProduct(data as ProductRow) : null;
  },

  async findMember(query): Promise<LoyaltyMember | null> {
    const digits = query.replace(/\D/g, "");
    if (!digits) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .or(`account_number.eq.${digits},phone.ilike.%${digits}%`)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapMember(data as MemberRow) : null;
  },

  async getOpenCart(): Promise<CartLine[]> {
    // A lane opens empty in production — the demo-seeded cart was a phase-1
    // convenience for showing off the register screen without a login.
    return [];
  },

  async getShiftSummary(shiftId): Promise<ShiftSummary> {
    const supabase = await createClient();

    const { data: shift, error: shiftErr } = await supabase
      .from("shifts")
      .select(
        "id, started_at, ended_at, opening_float_cents, cashier_id, lane_id, cashiers(full_name, badge), lanes(name)",
      )
      .eq("id", shiftId)
      .maybeSingle();
    if (shiftErr) throw shiftErr;
    if (!shift) throw new Error(`Shift ${shiftId} not found`);

    const cashierInfo = Array.isArray(shift.cashiers) ? shift.cashiers[0] : shift.cashiers;
    const laneInfo = Array.isArray(shift.lanes) ? shift.lanes[0] : shift.lanes;

    const { data: txns, error: txnErr } = await supabase
      .from("transactions")
      .select("id, total_cents")
      .eq("shift_id", shiftId)
      .eq("status", "settled");
    if (txnErr) throw txnErr;

    const transactionCount = txns?.length ?? 0;
    const grossSalesCents = (txns ?? []).reduce((sum, t) => sum + t.total_cents, 0);
    const averageBasketCents = transactionCount > 0 ? Math.round(grossSalesCents / transactionCount) : 0;
    const txnIds = (txns ?? []).map((t) => t.id);

    let cashSalesCents = 0;
    let itemCount = 0;
    if (txnIds.length > 0) {
      const { data: tenders } = await supabase
        .from("tenders")
        .select("kind, amount_cents")
        .in("transaction_id", txnIds);
      cashSalesCents = (tenders ?? [])
        .filter((t) => t.kind === "cash")
        .reduce((sum, t) => sum + t.amount_cents, 0);

      const { count } = await supabase
        .from("transaction_lines")
        .select("id", { count: "exact", head: true })
        .in("transaction_id", txnIds);
      itemCount = count ?? 0;
    }

    const startedAt = new Date(shift.started_at as string).getTime();
    const endedAt = shift.ended_at ? new Date(shift.ended_at as string).getTime() : Date.now();
    const elapsedMinutes = Math.max(1, (endedAt - startedAt) / 60_000);
    const scanVelocity = Math.round((itemCount / elapsedMinutes) * 10) / 10;

    const { data: dropRows } = await supabase
      .from("safe_drops")
      .select("id, sequence, envelope, amount_cents, created_at, verified_by")
      .eq("shift_id", shiftId)
      .order("sequence");

    const { data: overrideRows } = await supabase
      .from("override_log")
      .select("id, kind, title, detail, created_at")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: false });

    const verifierIds = [...new Set((dropRows ?? []).map((d) => d.verified_by).filter(Boolean))] as string[];
    let verifierNames = new Map<string, string>();
    if (verifierIds.length > 0) {
      const { data: verifiers } = await supabase
        .from("cashiers")
        .select("id, full_name")
        .in("id", verifierIds);
      verifierNames = new Map((verifiers ?? []).map((v) => [v.id, v.full_name]));
    }

    const safeDrops: SafeDrop[] = (dropRows ?? []).map((d) => ({
      id: d.id,
      sequence: d.sequence,
      envelope: d.envelope,
      amount: d.amount_cents,
      at: formatTime(d.created_at),
      verifiedBy: (d.verified_by && verifierNames.get(d.verified_by)) || "",
    }));

    const overrides: OverrideLogEntry[] = (overrideRows ?? []).map((o) => ({
      id: o.id,
      kind: o.kind,
      title: o.title,
      detail: o.detail ?? "",
      at: formatTime(o.created_at),
    }));

    return {
      id: shift.id,
      lane: laneInfo?.name ?? "",
      cashierName: cashierInfo?.full_name ?? "",
      badge: cashierInfo?.badge ?? "",
      startedAt: formatTime(shift.started_at as string),
      endsAt: shift.ended_at ? formatTime(shift.ended_at as string) : "",
      grossSalesCents,
      transactionCount,
      averageBasketCents,
      scanVelocity,
      openingFloatCents: shift.opening_float_cents,
      cashSalesCents,
      safeDrops,
      overrides,
    };
  },

  async listCashiers(): Promise<Cashier[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cashiers")
      .select("id, badge, full_name, email, role")
      .eq("active", true)
      .order("badge");
    if (error) throw error;
    return Promise.all((data as CashierRow[]).map((row) => mapCashier(supabase, row)));
  },

  async recordTransaction(input): Promise<{ id: string }> {
    const supabase = await createClient();

    const { data: lane, error: laneErr } = await supabase
      .from("lanes")
      .select("id")
      .eq("name", input.lane)
      .maybeSingle();
    if (laneErr) throw laneErr;
    if (!lane) throw new Error(`Unknown lane "${input.lane}"`);

    const { data: openShift } = await supabase
      .from("shifts")
      .select("id")
      .eq("cashier_id", input.cashierId)
      .eq("lane_id", lane.id)
      .eq("status", "open")
      .maybeSingle();

    let shiftId = openShift?.id as string | undefined;
    if (!shiftId) {
      const { data: newShift, error: shiftErr } = await supabase
        .from("shifts")
        .insert({ lane_id: lane.id, cashier_id: input.cashierId })
        .select("id")
        .single();
      if (shiftErr) throw shiftErr;
      shiftId = newShift.id;
    }

    const totals = computeTotals(input.lines, null);
    const orderNumber = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: txn, error: txnErr } = await supabase
      .from("transactions")
      .insert({
        order_number: orderNumber,
        lane_id: lane.id,
        shift_id: shiftId,
        cashier_id: input.cashierId,
        status: "settled",
        subtotal_cents: totals.subtotal,
        discount_cents: totals.discounts,
        tax_cents: totals.tax,
        deposit_cents: totals.deposits,
        total_cents: input.totalCents,
        settled_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (txnErr) throw txnErr;

    const lineRows = input.lines
      .filter((l) => !l.voided)
      .map((l, index) => ({
        transaction_id: txn.id,
        // Catalog ids from the UI don't correspond to Supabase product uuids
        // yet — see recordTransaction's doc comment. Name/price are already
        // denormalised onto the line, which is the source of truth here.
        product_id: null,
        name: l.name,
        unit_price_cents: l.overridePrice ?? l.unitPrice,
        unit_label: l.unitLabel,
        pricing_mode: l.pricingMode,
        qty: l.qty,
        weight_lb: l.weightLb ?? null,
        tare_lb: l.tareLb ?? null,
        tax_flag: l.taxFlag,
        ebt_eligible: l.ebtEligible,
        deposit_cents: l.depositCents ?? 0,
        discount_label: l.discount?.label ?? null,
        discount_cents: l.discount?.amount ?? 0,
        override_cents: l.overridePrice ?? null,
        voided: Boolean(l.voided),
        detail: l.detail,
        position: index,
      }));
    if (lineRows.length > 0) {
      const { error } = await supabase.from("transaction_lines").insert(lineRows);
      if (error) throw error;
    }

    const tenderRows = input.tenders.map((t) => ({
      transaction_id: txn.id,
      kind: t.kind,
      amount_cents: t.amount,
      tendered_cents: t.tendered ?? null,
      change_cents: t.changeGiven ?? null,
      reference: t.reference ?? null,
    }));
    if (tenderRows.length > 0) {
      const { error } = await supabase.from("tenders").insert(tenderRows);
      if (error) throw error;
    }

    return { id: txn.id };
  },
};
