/**
 * Restohub POS domain model.
 *
 * Money is stored in **integer cents** everywhere. Floating-point dollars drift
 * on a register that runs thousands of transactions a shift, and a one-cent
 * drawer variance is a real incident. Convert at the display boundary only.
 */

export type Cents = number;

/** How an item's price is derived. */
export type PricingMode =
  /** Sold by weight on the scale: price = netWeight × unitPrice. */
  | "scale"
  /** Sold by count: price = qty × unitPrice. */
  | "count";

/** Receipt tax flag printed next to each line. */
export type TaxFlag =
  /** Food — exempt from state sales tax. */
  | "F"
  /** Taxable general merchandise. */
  | "T";

export type Department =
  | "Produce"
  | "Dairy"
  | "Bakery"
  | "Deli"
  | "Seafood"
  | "Meat"
  | "Grocery"
  | "Beverage"
  | "Frozen"
  | "Non-Food";

export interface Product {
  id: string;
  /** 4- or 5-digit produce PLU. A leading 9 means organic. */
  plu?: string;
  /** Scanned barcode for packaged goods. */
  upc?: string;
  /** Internal SKU for deli/bakery/self-serve. */
  sku?: string;
  name: string;
  /** Second line on tiles and cards — variety, grade, pack. */
  subtitle?: string;
  department: Department;
  /** Numeric department code printed on the receipt. */
  departmentCode: string;
  pricingMode: PricingMode;
  /** Cents per lb (scale) or cents each (count). */
  unitPrice: Cents;
  unitLabel: "lb" | "each";
  taxFlag: TaxFlag;
  /** SNAP/EBT food-eligible. */
  ebtEligible: boolean;
  /** Container deposit added per unit, e.g. CRV. */
  depositCents?: Cents;
  organic?: boolean;
  /** Key into the produce illustration set. */
  art?: string;
  /** Material Symbols ligature used on compact fast-key tiles. */
  icon?: string;
  /** Tailwind text-* class for the tile icon. */
  iconClass?: string;
  /** Display-only promo string on fast keys, e.g. "3/$2.00". */
  promoLabel?: string;
  categories?: string[];
}

/** A discount attached to a single cart line. */
export interface LineDiscount {
  label: string;
  amount: Cents;
  /** A supervisor override rather than an automatic promotion. */
  requiresOverride?: boolean;
}

export interface CartLine {
  id: string;
  productId: string;
  name: string;
  /** Frozen at scan time so later catalog edits cannot rewrite history. */
  unitPrice: Cents;
  unitLabel: "lb" | "each";
  pricingMode: PricingMode;
  /** Count for `count` items; unused for `scale`. */
  qty: number;
  /** Net weight in pounds for `scale` items. */
  weightLb?: number;
  /** Tare deducted from gross weight, in pounds. */
  tareLb?: number;
  taxFlag: TaxFlag;
  ebtEligible: boolean;
  depositCents?: Cents;
  /** Descriptor line under the name: "4 @ $1.25 ea • PLU 4225". */
  detail: string;
  discount?: LineDiscount;
  voided?: boolean;
  /** Price manually overridden by a supervisor. */
  overridePrice?: Cents;
}

export interface LoyaltyMember {
  id: string;
  accountNumber: string;
  name: string;
  tier: "Gold" | "Silver" | "Member";
  points: number;
  /** Reward the cashier can apply with one tap. */
  rewardAvailable: Cents;
  email?: string;
  phone?: string;
  couponsApplied?: { label: string; amount: Cents }[];
}

/** Everything the footer, headers and receipt need about the running cart. */
export interface CartTotals {
  subtotal: Cents;
  discounts: Cents;
  ebtEligible: Cents;
  nonEbtTaxable: Cents;
  tax: Cents;
  deposits: Cents;
  total: Cents;
  itemCount: number;
  totalWeightLb: number;
}

export type TenderKind = "cash" | "card" | "ebt_snap" | "ebt_cash" | "gift" | "wic";

export interface TenderEntry {
  id: string;
  kind: TenderKind;
  /** Amount applied to the balance. */
  amount: Cents;
  /** What the customer handed over — only differs from `amount` for cash. */
  tendered?: Cents;
  changeGiven?: Cents;
  reference?: string;
  at: string;
}

export interface Cashier {
  id: string;
  name: string;
  badge: string;
  role: "cashier" | "supervisor" | "manager";
  /** 4–6 digits. Dummy provider only — never store a plaintext PIN in Supabase. */
  pin: string;
  email: string;
  shiftId: string;
  shiftStart: string;
  shiftEnd: string;
}

export interface SafeDrop {
  id: string;
  sequence: number;
  envelope: string;
  amount: Cents;
  at: string;
  verifiedBy: string;
}

export interface OverrideLogEntry {
  id: string;
  kind: "price_override" | "post_tender_void" | "line_void" | "no_sale";
  title: string;
  detail: string;
  at: string;
}

export interface ShiftSummary {
  id: string;
  lane: string;
  cashierName: string;
  badge: string;
  startedAt: string;
  endsAt: string;
  grossSalesCents: Cents;
  transactionCount: number;
  averageBasketCents: Cents;
  scanVelocity: number;
  openingFloatCents: Cents;
  cashSalesCents: Cents;
  safeDrops: SafeDrop[];
  overrides: OverrideLogEntry[];
}

/** One row of the drawer count. */
export interface Denomination {
  id: string;
  /** Unit value in cents; `null` means the cashier enters a dollar total directly. */
  valueCents: Cents | null;
  label: string;
  sublabel: string;
  chip: string;
  /** Bill rows count pieces; the coin row takes a dollar amount. */
  defaultCount: number;
}

export interface HardwareStatus {
  scannerReady: boolean;
  scaleStable: boolean;
  scaleCalibrated: boolean;
  printerPaperPercent: number;
  drawerOpen: boolean;
  pinPadReady: boolean;
  edgeLatencyMs: number;
}

export interface ScaleReading {
  grossLb: number;
  tareLb: number;
  stable: boolean;
}
