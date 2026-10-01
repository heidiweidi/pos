/**
 * Currency, tax and discount rules ("region").
 *
 * The admin picks a currency; each currency carries the tax system and the
 * statutory discounts that go with it:
 *
 *  - USD — US sales tax, added on top of the shelf price for taxable (`T`)
 *    items, food (`F`) exempt. EBT/SNAP applies.
 *  - PHP — Philippine VAT. Shelf prices are VAT-inclusive; `T` items are VATable
 *    and `F` items are VAT-exempt. Senior Citizen and PWD customers get the
 *    statutory 20% discount with the VAT taken off first (RA 9994 / RA 10754).
 *
 * There is no FX conversion: switching currency changes the symbol and rules,
 * not the stored prices — re-price the catalog in Manage Products.
 */

export const CURRENCY_CODES = ["USD", "PHP"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export type TaxMode = "sales_tax" | "vat";

/** A statutory customer discount the cashier can apply to the whole sale. */
export type DiscountKind = "senior" | "pwd";

/** Admin-editable values, persisted. */
export interface RegionSettings {
  currency: CurrencyCode;
  /** Sales tax (USD) or VAT (PHP) rate, in percent. */
  taxRatePct: number;
  /** PHP only. A non-VAT business shows no VAT; prices are left as they are. */
  vatRegistered: boolean;
  /** PHP only. Senior Citizen / PWD discount, in percent (statutory: 20). */
  seniorPwdPct: number;
}

/** Fixed facts about a currency, not editable. */
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  taxMode: TaxMode;
  taxName: string;
  defaultTaxRatePct: number;
  /** Receipt flag printed beside a line, by the product's tax flag. */
  flagLabels: { T: string; F: string };
  /** Benefit tenders (EBT/SNAP, WIC) exist only in the US. */
  ebt: boolean;
  /** Statutory discounts offered on the register. */
  discounts: DiscountKind[];
  /** Amount staged by the manager screen's "Safe Cash Drop" button, in cents. */
  safeDropCents: number;
  /** "Fast cash" shortcut on the register, in cents. */
  fastCashCents: number;
  /** Quick-bill presets on the cash pad, in cents. */
  quickBillsCents: [number, number, number];
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    taxMode: "sales_tax",
    taxName: "State Sales Tax",
    defaultTaxRatePct: 6.25,
    flagLabels: { T: "T", F: "F" },
    ebt: true,
    discounts: [],
    safeDropCents: 50_000,
    fastCashCents: 5_000,
    quickBillsCents: [5_000, 2_000, 10_000],
  },
  PHP: {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    taxMode: "vat",
    taxName: "VAT",
    defaultTaxRatePct: 12,
    flagLabels: { T: "V", F: "E" },
    ebt: false,
    discounts: ["senior", "pwd"],
    safeDropCents: 500_000,
    fastCashCents: 50_000,
    quickBillsCents: [50_000, 20_000, 100_000],
  },
};

export const DISCOUNT_LABELS: Record<DiscountKind, string> = {
  senior: "Senior Citizen",
  pwd: "Person with Disability (PWD)",
};

/** A statutory discount attached to the current sale. */
export interface CartDiscount {
  kind: DiscountKind;
  /** OSCA / PWD ID number — required on the BIR-compliant receipt. */
  idNumber: string;
  holderName: string;
}

export const DEFAULT_REGION: RegionSettings = {
  currency: "USD",
  taxRatePct: CURRENCIES.USD.defaultTaxRatePct,
  vatRegistered: true,
  seniorPwdPct: 20,
};

export function defaultsFor(currency: CurrencyCode): RegionSettings {
  return { ...DEFAULT_REGION, currency, taxRatePct: CURRENCIES[currency].defaultTaxRatePct };
}

function pct(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : fallback;
}

/** Tolerates a missing/partial/corrupt stored value. */
export function parseRegion(raw: unknown): RegionSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const currency = CURRENCY_CODES.find((c) => c === r.currency) ?? DEFAULT_REGION.currency;
  const base = defaultsFor(currency);
  return {
    currency,
    taxRatePct: pct(r.taxRatePct, base.taxRatePct),
    vatRegistered: typeof r.vatRegistered === "boolean" ? r.vatRegistered : base.vatRegistered,
    seniorPwdPct: pct(r.seniorPwdPct, base.seniorPwdPct),
  };
}
