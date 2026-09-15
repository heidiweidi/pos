import type { CartLine, CartTotals, Cents, LoyaltyMember } from "./types";

/** State sales tax applied to non-food items. Matches the design's 6.25%. */
export const TAX_RATE = 0.0625;

/** Rounds half away from zero, which is what a till does. */
export function roundCents(value: number): Cents {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function formatMoney(cents: Cents, withSymbol = true): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const body = (abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${negative ? "-" : ""}${withSymbol ? "$" : ""}${body}`;
}

export function formatWeight(lb: number, digits = 2): string {
  return lb.toFixed(digits);
}

export function parseDollarsToCents(input: string): Cents {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  return roundCents(Number.parseFloat(cleaned) * 100);
}

/** Price of a single line before its discount, after any supervisor override. */
export function lineGross(line: CartLine): Cents {
  if (line.voided) return 0;
  if (line.overridePrice !== undefined) return line.overridePrice;

  const base =
    line.pricingMode === "scale"
      ? roundCents((line.weightLb ?? 0) * line.unitPrice)
      : roundCents(line.qty * line.unitPrice);

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
export function computeTotals(lines: CartLine[], member?: LoyaltyMember | null): CartTotals {
  let subtotal = 0;
  let lineDiscounts = 0;
  let ebtEligible = 0;
  let nonEbtTaxable = 0;
  let deposits = 0;
  let taxableBase = 0;
  let itemCount = 0;
  let totalWeightLb = 0;

  for (const line of lines) {
    if (line.voided) continue;

    const discount = line.discount?.amount ?? 0;
    const net = lineGross(line) - discount;
    const lineDeposit = (line.depositCents ?? 0) * (line.pricingMode === "scale" ? 1 : line.qty);

    subtotal += net;
    lineDiscounts += discount;
    deposits += lineDeposit;

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

  // A member reward comes off the cart as a whole, after the line promos.
  const memberCoupons = (member?.couponsApplied ?? []).reduce((sum, c) => sum + c.amount, 0);
  const appliedCoupons = Math.min(memberCoupons, subtotal);
  if (appliedCoupons > 0) {
    subtotal -= appliedCoupons;
    ebtEligible = Math.max(0, ebtEligible - appliedCoupons);
  }

  const tax = roundCents(taxableBase * TAX_RATE);
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
    totalWeightLb: Number(totalWeightLb.toFixed(2)),
  };
}

/** Builds the grey descriptor line under a cart item's name. */
export function describeLine(
  line: Pick<CartLine, "pricingMode" | "qty" | "unitPrice" | "weightLb" | "tareLb">,
  codeLabel: string,
): string {
  if (line.pricingMode === "scale") {
    const tare = line.tareLb ? ` • Tare ${formatWeight(line.tareLb)} lb` : "";
    return `${formatWeight(line.weightLb ?? 0)} lb @ ${formatMoney(line.unitPrice)}/lb${tare} • ${codeLabel}`;
  }
  return `${line.qty} @ ${formatMoney(line.unitPrice)} ea • ${codeLabel}`;
}

/** Qty column text: "4" for counted items, "2.34#" for weighed ones. */
export function quantityLabel(line: CartLine): string {
  return line.pricingMode === "scale" ? `${formatWeight(line.weightLb ?? 0)}#` : String(line.qty);
}
