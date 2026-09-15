import type {
  CartLine,
  Cashier,
  Denomination,
  HardwareStatus,
  LoyaltyMember,
  ShiftSummary,
} from "../types";

/** Dummy staff. Replaced by Supabase Auth + a `cashiers` row in phase 2. */
export const CASHIERS: Cashier[] = [
  {
    id: "c-0482",
    name: "Sarah Jenkins",
    badge: "0482",
    role: "manager",
    pin: "4821",
    email: "sarah.jenkins@restohub.test",
    shiftId: "482",
    shiftStart: "07:30 AM",
    shiftEnd: "03:45 PM",
  },
  {
    id: "c-0517",
    name: "Mike Torres",
    badge: "0517",
    role: "supervisor",
    pin: "8021",
    email: "mike.torres@restohub.test",
    shiftId: "483",
    shiftStart: "03:45 PM",
    shiftEnd: "11:00 PM",
  },
  {
    id: "c-0630",
    name: "Ana Reyes",
    badge: "0630",
    role: "cashier",
    pin: "1357",
    email: "ana.reyes@restohub.test",
    shiftId: "484",
    shiftStart: "06:00 AM",
    shiftEnd: "02:15 PM",
  },
];

export const DEFAULT_CASHIER = CASHIERS[0];

export const DEMO_MEMBER: LoyaltyMember = {
  id: "m-84920",
  accountNumber: "84920",
  name: "Marcus Vance",
  tier: "Gold",
  points: 340,
  rewardAvailable: 500,
  email: "m.vance@example.com",
  phone: "(555) 382-9912",
  couponsApplied: [],
};

/**
 * The cart the Active Register opens with, matching the design screenshot
 * line-for-line so the converted screen reproduces its totals.
 */
export const DEMO_CART: CartLine[] = [
  {
    id: "l-1",
    productId: "p-4225",
    name: "Organic Hass Avocados",
    unitPrice: 125,
    unitLabel: "each",
    pricingMode: "count",
    qty: 4,
    taxFlag: "F",
    ebtEligible: true,
    detail: "4 @ $1.25 ea • PLU 4225",
  },
  {
    id: "l-2",
    productId: "p-milk",
    name: "Whole Milk 1 Gallon",
    unitPrice: 379,
    unitLabel: "each",
    pricingMode: "count",
    qty: 1,
    taxFlag: "F",
    ebtEligible: true,
    detail: "UPC 04122081921 • Dairy",
  },
  {
    id: "l-3",
    productId: "p-3283",
    name: "Honeycrisp Apples",
    unitPrice: 249,
    unitLabel: "lb",
    pricingMode: "scale",
    qty: 1,
    weightLb: 2.34,
    tareLb: 0.02,
    taxFlag: "F",
    ebtEligible: true,
    detail: "2.34 lb @ $2.49/lb • Tare 0.02 lb • PLU 3283",
  },
  {
    id: "l-4",
    productId: "p-salmon",
    name: "Fresh Atlantic Salmon Fillet",
    unitPrice: 1299,
    unitLabel: "lb",
    pricingMode: "scale",
    qty: 1,
    weightLb: 1.15,
    taxFlag: "F",
    ebtEligible: true,
    detail: "1.15 lb @ $12.99/lb • Seafood Dept",
  },
  {
    id: "l-5",
    productId: "p-butter",
    name: "Kerrygold Pure Irish Butter 8oz",
    unitPrice: 549,
    unitLabel: "each",
    pricingMode: "count",
    qty: 1,
    taxFlag: "F",
    ebtEligible: true,
    detail: "UPC 07677070001",
    discount: { label: "Save $1.00", amount: 100 },
  },
  {
    id: "l-6",
    productId: "p-sourdough",
    name: "Sourdough Artisan Boule",
    unitPrice: 429,
    unitLabel: "each",
    pricingMode: "count",
    qty: 1,
    taxFlag: "F",
    ebtEligible: true,
    detail: "Bakery Scratch • PLU 4132",
  },
  {
    id: "l-7",
    productId: "p-94011",
    name: "Organic Cavendish Bananas",
    unitPrice: 69,
    unitLabel: "lb",
    pricingMode: "scale",
    qty: 1,
    weightLb: 3.12,
    taxFlag: "F",
    ebtEligible: true,
    detail: "3.12 lb @ $0.69/lb • PLU 94011",
  },
  {
    id: "l-8",
    productId: "p-sparkling",
    name: "Sparkling Spring Water 12-pk",
    unitPrice: 599,
    unitLabel: "each",
    pricingMode: "count",
    qty: 1,
    taxFlag: "T",
    ebtEligible: false,
    depositCents: 60,
    detail: "Deposit Fee: +$0.60 (CRV) • Tax T",
  },
];

export const DEMO_SHIFT: ShiftSummary = {
  id: "shift-482",
  lane: "Lane 04",
  cashierName: "Sarah Jenkins",
  badge: "0482",
  startedAt: "07:30 AM",
  endsAt: "03:45 PM",
  grossSalesCents: 384_265,
  transactionCount: 142,
  averageBasketCents: 2_706,
  scanVelocity: 21.4,
  openingFloatCents: 25_000,
  cashSalesCents: 142_000,
  safeDrops: [
    {
      id: "d-1",
      sequence: 1,
      envelope: "4091",
      amount: 50_000,
      at: "10:45 AM",
      verifiedBy: "Mike T.",
    },
    {
      id: "d-2",
      sequence: 2,
      envelope: "4118",
      amount: 30_000,
      at: "01:30 PM",
      verifiedBy: "Mike T.",
    },
  ],
  overrides: [
    {
      id: "o-1",
      kind: "price_override",
      title: "Price Override: Organic Strawberries",
      detail: "Approved $5.00 match (Competitor Ad) • Auth Mgr: 8021",
      at: "02:15 PM",
    },
    {
      id: "o-2",
      kind: "post_tender_void",
      title: "Post-Tender Void: Txn #1042",
      detail: "Customer card declined at gate • Approved by Mike T.",
      at: "11:08 AM",
    },
  ],
};

/** Drawer count rows. The last row takes a dollar value rather than a piece count. */
export const DENOMINATIONS: Denomination[] = [
  {
    id: "d100",
    valueCents: 10_000,
    chip: "$100",
    label: "Hundred Dollar Notes",
    sublabel: "Federal Reserve Note",
    defaultCount: 2,
  },
  {
    id: "d50",
    valueCents: 5_000,
    chip: "$50",
    label: "Fifty Dollar Notes",
    sublabel: "Grant Note",
    defaultCount: 4,
  },
  {
    id: "d20",
    valueCents: 2_000,
    chip: "$20",
    label: "Twenty Dollar Notes",
    sublabel: "Jackson Note",
    defaultCount: 15,
  },
  {
    id: "d10",
    valueCents: 1_000,
    chip: "$10",
    label: "Ten Dollar Notes",
    sublabel: "Hamilton Note",
    defaultCount: 10,
  },
  {
    id: "d5",
    valueCents: 500,
    chip: "$5",
    label: "Five Dollar Notes",
    sublabel: "Lincoln Note",
    defaultCount: 10,
  },
  {
    id: "d1",
    valueCents: 100,
    chip: "$1",
    label: "One Dollar Notes",
    sublabel: "Washington Note",
    defaultCount: 18,
  },
  {
    id: "dcoin",
    valueCents: null,
    chip: "¢",
    label: "Loose Coins & Rolls",
    sublabel: "25¢, 10¢, 5¢, 1¢ total value",
    defaultCount: 200,
  },
];

export const DEFAULT_HARDWARE: HardwareStatus = {
  scannerReady: true,
  scaleStable: true,
  scaleCalibrated: true,
  printerPaperPercent: 68,
  drawerOpen: false,
  pinPadReady: true,
  edgeLatencyMs: 12,
};

/** Tare presets on the PLU scale dock, in pounds. */
export const TARE_PRESETS = [
  { id: "bag", label: "Bag", lb: 0.01 },
  { id: "paper", label: "Paper", lb: 0.05 },
  { id: "tub", label: "Tub", lb: 0.12 },
];

export const LANE_NAME = process.env.NEXT_PUBLIC_POS_LANE ?? "Lane 04";
export const TERMINAL_NAME = process.env.NEXT_PUBLIC_POS_TERMINAL ?? "Main Terminal";
