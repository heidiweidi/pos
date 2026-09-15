import type { CartLine, Cashier, LoyaltyMember, Product, ShiftSummary, TenderEntry } from "../types";

/**
 * The one seam between the UI and its data source.
 *
 * Phase 1 ships `mockAdapter` (typed constants, no network). Phase 2 adds
 * `supabaseAdapter` implementing the same interface and flips `getDataAdapter()`
 * on an env flag — no screen or component changes.
 */
export interface PosDataAdapter {
  readonly name: "mock" | "supabase";

  /** Whole catalog, used by the fast keys and the PLU directory. */
  listProducts(): Promise<Product[]>;
  /** Scanner / manual-entry path. Accepts PLU, UPC or SKU. */
  findProductByCode(code: string): Promise<Product | null>;
  /** Loyalty lookup by phone or account number. */
  findMember(query: string): Promise<LoyaltyMember | null>;
  /** The cart a lane resumes on load — empty in production, seeded in demo mode. */
  getOpenCart(lane: string): Promise<CartLine[]>;
  /** Shift KPIs, safe drops and override log for the manager screen. */
  getShiftSummary(shiftId: string): Promise<ShiftSummary>;
  /** Roster for the sign-in screen's badge list and PIN unlock. */
  listCashiers(): Promise<Cashier[]>;
  /** Persists a settled transaction. Phase 1 just resolves an id. */
  recordTransaction(input: {
    lane: string;
    cashierId: string;
    lines: CartLine[];
    tenders: TenderEntry[];
    totalCents: number;
  }): Promise<{ id: string }>;
}

export type { Product, CartLine, LoyaltyMember, ShiftSummary, Cashier, TenderEntry };
