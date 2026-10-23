import { CURRENCIES, type CartDiscount, type CurrencyCode, type RegionSettings } from "./region";
import type { CartLine, CartTotals, Cents, LoyaltyMember } from "./types";

/** State sales tax applied to non-food items. Matches the design's 6.25%. */
export const TAX_RATE = 0.0625;

/** Rounds half away from zero, which is what a till does. */
export function roundCents(value: number): Cents {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * The terminal's active currency. `formatMoney` is called from dozens of plain
 * functions, so the symbol lives here rather than being threaded through each
 * one; `RegionProvider` sets it before any screen renders and remounts the
 * shell when it changes.
 */
let activeCurrency: CurrencyCode = "USD";

export function setActiveCurrency(code: CurrencyCode): void {
  activeCurrency = code;
}

export function currencySymbol(): string {
  return CURRENCIES[activeCurrency].symbol;
}

export function formatMoney(cents: Cents, withSymbol = true): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const body = (abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${negative ? "-" : ""}${withSymbol ? currencySymbol() : ""}${body}`;
}

export function formatWeight(lb: number, digits = 2): string {
  return lb.toFixed(digits);
}

export function parseDollarsToCents(input: string): Cents {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  return roundCents(Number.parseFloat(cleaned) * 100);
}

/** Count items: every full multi-buy group at the bundle price, the rest at unit price. */
export function countPrice(
  line: Pick<CartLine, "qty" | "unitPrice" | "bulkQty" | "bulkPriceCents">,
): Cents {
  const { bulkQty, bulkPriceCents } = line;
  if (bulkQty && bulkQty >= 2 && bulkPriceCents !== undefined) {
    const groups = Math.floor(line.qty / bulkQty);
    return groups * bulkPriceCents + roundCents((line.qty - groups * bulkQty) * line.unitPrice);
  }
  return roundCents(line.qty * line.unitPrice);
}

/** "3/$2.00" — the multi-buy label for a fast-key tile, in the active currency. */
export function bulkLabel(bulk: { qty: number; priceCents: Cents }): string {
  return `${bulk.qty}/${formatMoney(bulk.priceCents)}`;
}

/** Price of a single line before its discount, after any supervisor override. */
export function lineGross(line: CartLine): Cents {
  if (line.voided) return 0;
  if (line.overridePrice !== undefined) return line.overridePrice;

  const base =
    line.pricingMode === "scale"
      ? roundCents((line.weightLb ?? 0) * line.unitPrice)
      : countPrice(line);

  const deposit = (line.depositCents ?? 0) * (line.pricingMode === "scale" ? 1 : line.qty);
  return base + deposit;
}

/** What prints in the Total column — gross less the line discount. */
export function lineNet(line: CartLine): Cents {
  if (line.voided) return 0;
  return lineGross(line) - (line.discount?.amount ?? 0);
}

/**
 * Rolls a cart up into the figures the footer, tender screen and receipt print.
 *
 * `subtotal` is the sum of the tape's visible Total column — net of line
 * discounts and inclusive of container deposits — because that is the number a
 * cashier eyeballs against the receipt. Tax is then added on top:
 *
 *     total = subtotal - memberCoupons + tax
 *
 * Note this deliberately differs from the source mockup's footer, which showed
 * `47.08 - 1.00 + 0.52 = 46.60`. Its 47.08 was already net of the butter's
 * -$1.00 promo, so that promo came off twice, and its $0.52 "tax & deposit"
 * matches no combination of its own line items. A register has to balance, so
 * the engine computes the figure rather than reproducing the artwork's.
 */
/** How a cart is taxed and discounted — derived from the admin's region settings. */
export interface TaxConfig {
  mode: "sales_tax" | "vat";
  /** As a fraction, e.g. 0.12. */
  rate: number;
  /** VAT mode only. When false no VAT is shown or backed out of prices. */
  vatRegistered: boolean;
  /** Senior/PWD discount as a fraction, e.g. 0.2. */
  seniorPwdRate: number;
}

/** US sales tax at the design's 6.25% — the default, and what the totals check asserts. */
export const US_TAX_CONFIG: TaxConfig = {
  mode: "sales_tax",
  rate: TAX_RATE,
  vatRegistered: true,
  seniorPwdRate: 0,
};

export function taxConfigFor(region: RegionSettings): TaxConfig {
  return {
    mode: CURRENCIES[region.currency].taxMode,
    rate: region.taxRatePct / 100,
    vatRegistered: region.vatRegistered,
    seniorPwdRate: region.seniorPwdPct / 100,
  };
}

export function computeTotals(
  lines: CartLine[],
  member?: LoyaltyMember | null,
  config: TaxConfig = US_TAX_CONFIG,
  discount: CartDiscount | null = null,
): CartTotals {
  let subtotal = 0;
  let lineDiscounts = 0;
  let ebtEligible = 0;
  let nonEbtTaxable = 0;
  let deposits = 0;
  let taxableBase = 0;
  /** VAT mode: merchandise (ex-deposit) by tax flag, at VAT-inclusive shelf prices. */
  let taxableGross = 0;
  let exemptGross = 0;
  let itemCount = 0;
  let totalWeightLb = 0;

  for (const line of lines) {
    if (line.voided) continue;

    const discountAmount = line.discount?.amount ?? 0;
    const net = lineGross(line) - discountAmount;
    const lineDeposit = (line.depositCents ?? 0) * (line.pricingMode === "scale" ? 1 : line.qty);

    subtotal += net;
    lineDiscounts += discountAmount;
    deposits += lineDeposit;

    if (line.taxFlag === "T") taxableGross += net - lineDeposit;
    else exemptGross += net - lineDeposit;

    if (line.ebtEligible) {
      // Deposits are never SNAP-eligible, even on an otherwise eligible drink.
      ebtEligible += net - lineDeposit;
    } else {
      nonEbtTaxable += net - lineDeposit;
      // Container deposits are a refundable charge, not taxable merchandise.
      taxableBase += net - lineDeposit;
    }

    // The tape shows one row per line; a weighed item is one item, not 2.34.
    itemCount += 1;
    if (line.pricingMode === "scale") totalWeightLb += line.weightLb ?? 0;
  }

  const weight = Number(totalWeightLb.toFixed(2));

  if (config.mode === "vat") {
    const registered = config.vatRegistered;
    const vatable = (gross: Cents) => (registered ? roundCents(gross / (1 + config.rate)) : gross);

    // Senior Citizen / PWD: the VAT comes off the shelf price first, then the
    // statutory discount applies to that VAT-exclusive amount. The two never
    // stack with a member reward, so rewards are ignored while one is applied.
    if (discount && subtotal > 0) {
      const exclusiveTaxable = vatable(taxableGross);
      const vatRemoved = taxableGross - exclusiveTaxable;
      const exclusive = exclusiveTaxable + exemptGross;
      const scpwdDiscount = roundCents(exclusive * config.seniorPwdRate);
      return {
        subtotal,
        discounts: lineDiscounts + scpwdDiscount,
        ebtEligible,
        nonEbtTaxable,
        tax: 0,
        deposits,
        total: subtotal - vatRemoved - scpwdDiscount,
        itemCount,
        totalWeightLb: weight,
        taxInclusive: true,
        vatableSales: 0,
        vatExemptSales: registered ? exclusive : 0,
        scpwdVatRemoved: vatRemoved,
        scpwdDiscount,
      };
    }

    // A member reward is spread across the VATable and exempt sales pro rata.
    const memberCoupons = (member?.couponsApplied ?? []).reduce((sum, c) => sum + c.amount, 0);
    const appliedCoupons = Math.min(memberCoupons, subtotal);
    const merchandise = taxableGross + exemptGross;
    const couponOnTaxable = merchandise > 0 ? roundCents((appliedCoupons * taxableGross) / merchandise) : 0;
    const taxableAfter = taxableGross - couponOnTaxable;
    const exemptAfter = exemptGross - (appliedCoupons - couponOnTaxable);

    const vatableSales = registered ? vatable(taxableAfter) : 0;
    return {
      subtotal: subtotal - appliedCoupons,
      discounts: lineDiscounts + appliedCoupons,
      ebtEligible,
      nonEbtTaxable,
      tax: registered ? taxableAfter - vatableSales : 0,
      deposits,
      total: subtotal - appliedCoupons,
      itemCount,
      totalWeightLb: weight,
      taxInclusive: true,
      vatableSales,
      vatExemptSales: registered ? exemptAfter : 0,
      scpwdVatRemoved: 0,
      scpwdDiscount: 0,
    };
  }

  // A member reward comes off the cart as a whole, after the line promos.
  const memberCoupons = (member?.couponsApplied ?? []).reduce((sum, c) => sum + c.amount, 0);
  const appliedCoupons = Math.min(memberCoupons, subtotal);
  if (appliedCoupons > 0) {
    subtotal -= appliedCoupons;
    ebtEligible = Math.max(0, ebtEligible - appliedCoupons);
  }

  const tax = roundCents(taxableBase * config.rate);
  const total = subtotal + tax;

  return {
    subtotal,
    discounts: lineDiscounts + appliedCoupons,
    ebtEligible,
    nonEbtTaxable,
    tax,
    deposits,
    total,
    itemCount,
    totalWeightLb: weight,
    taxInclusive: false,
    vatableSales: 0,
    vatExemptSales: 0,
    scpwdVatRemoved: 0,
    scpwdDiscount: 0,
  };
}

/** Builds the grey descriptor line under a cart item's name. */
export function describeLine(
  line: Pick<CartLine, "pricingMode" | "qty" | "unitPrice" | "weightLb" | "tareLb" | "bulkQty" | "bulkPriceCents">,
  codeLabel: string,
): string {
  if (line.pricingMode === "scale") {
    const tare = line.tareLb ? ` • Tare ${formatWeight(line.tareLb)} lb` : "";
    return `${formatWeight(line.weightLb ?? 0)} lb @ ${formatMoney(line.unitPrice)}/lb${tare} • ${codeLabel}`;
  }
  const bulk =
    line.bulkQty && line.bulkPriceCents !== undefined
      ? ` • ${line.bulkQty} for ${formatMoney(line.bulkPriceCents)}`
      : "";
  return `${line.qty} @ ${formatMoney(line.unitPrice)} ea${bulk} • ${codeLabel}`;
}

/** Qty column text: "4" for counted items, "2.34#" for weighed ones. */
export function quantityLabel(line: CartLine): string {
  return line.pricingMode === "scale" ? `${formatWeight(line.weightLb ?? 0)}#` : String(line.qty);
}
