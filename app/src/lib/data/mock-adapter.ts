import type { PosDataAdapter } from "./adapter";
import { PRODUCTS, lookupByCode } from "./catalog";
import { CASHIERS, DEMO_CART, DEMO_MEMBER, DEMO_SHIFT } from "./session";

/** Simulates a little latency so loading states are exercised in dev. */
const tick = <T,>(value: T, ms = 0): Promise<T> =>
  ms > 0 ? new Promise((resolve) => setTimeout(() => resolve(value), ms)) : Promise.resolve(value);

export const mockAdapter: PosDataAdapter = {
  name: "mock",

  listProducts: () => tick(PRODUCTS),

  findProductByCode: (code) => tick(lookupByCode(code) ?? null),

  findMember: (query) => {
    const q = query.replace(/\D/g, "");
    const matches =
      q.length > 0 &&
      (DEMO_MEMBER.accountNumber.includes(q) || (DEMO_MEMBER.phone ?? "").replace(/\D/g, "").includes(q));
    return tick(matches ? DEMO_MEMBER : null);
  },

  getOpenCart: () => tick(DEMO_CART),

  getShiftSummary: () => tick(DEMO_SHIFT),

  listCashiers: () => tick(CASHIERS),

  recordTransaction: async () => tick({ id: `txn-${Date.now().toString(36)}` }),
};
