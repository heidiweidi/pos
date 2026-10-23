/**
 * Optional POS features ("add-ons").
 *
 * The register ships as a plain scan → cart → pay terminal. Everything else
 * lives behind one of these switches, which only a manager can flip (Manage
 * Add-ons). All of them default to OFF, and none of them remove code — the
 * underlying features are untouched, just hidden until enabled.
 */

export const ADDON_IDS = ["scale", "loyalty", "ebt", "giftcard", "overrides", "holds", "shopee"] as const;

export type AddonId = (typeof ADDON_IDS)[number];

export type AddonState = Record<AddonId, boolean>;

export interface AddonInfo {
  id: AddonId;
  label: string;
  icon: string;
  description: string;
  /** What the cashier gains while it is on. */
  adds: string[];
}

export const ADDONS: readonly AddonInfo[] = [
  {
    id: "scale",
    label: "Scale & Weighed Items",
    icon: "scale",
    description: "Sell by weight: scale readout, tare, and the Produce PLU Lookup screen.",
    adds: ["Scale readout and tare", "Produce PLU Lookup screen", "Weighed items on fast keys"],
  },
  {
    id: "loyalty",
    label: "Loyalty Members",
    icon: "badge",
    description: "Attach a member to the sale and apply their rewards.",
    adds: ["Member lookup", "Reward / coupon savings", "Member banner on the receipt tape"],
  },
  {
    id: "ebt",
    label: "EBT / SNAP & WIC",
    icon: "local_mall",
    description: "Benefit tenders with the food-eligible split.",
    adds: ["EBT SNAP and EBT Cash tenders", "WIC / voucher tender", "SNAP-eligible breakdown", "Split tender"],
  },
  {
    id: "giftcard",
    label: "Gift Cards",
    icon: "card_giftcard",
    description: "Accept store gift cards and points as payment.",
    adds: ["Gift card tender"],
  },
  {
    id: "overrides",
    label: "Overrides & Drawer",
    icon: "supervisor_account",
    description: "Supervisor price overrides, no-sale drawer open and the Call Manager button.",
    adds: ["Price override", "Open Drawer (no sale)", "Call Manager"],
  },
  {
    id: "holds",
    label: "Hold & Recall Cart",
    icon: "pause_circle",
    description: "Park a sale and come back to it.",
    adds: ["Hold Cart", "Recall Cart"],
  },
  {
    id: "shopee",
    label: "Shopee Product Sync",
    icon: "sync_alt",
    description:
      "Pull your Shopee product list into Manage Products (read-only — nothing is ever changed on Shopee). Needs Actual mode; set it up under Data Mode.",
    adds: ["Shopee connection in Data Mode", "Sync products from Shopee", "Source filter in Manage Products"],
  },
];

export const DEFAULT_ADDONS: AddonState = {
  scale: false,
  loyalty: false,
  ebt: false,
  giftcard: false,
  overrides: false,
  holds: false,
  shopee: false,
};

/** Tolerates a missing/partial/corrupt stored value — unknown keys are ignored. */
export function parseAddons(raw: unknown): AddonState {
  const next = { ...DEFAULT_ADDONS };
  if (raw && typeof raw === "object") {
    for (const id of ADDON_IDS) {
      const value = (raw as Record<string, unknown>)[id];
      if (typeof value === "boolean") next[id] = value;
    }
  }
  return next;
}
