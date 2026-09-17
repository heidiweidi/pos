"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import { DEMO_CART, DEMO_MEMBER, DEFAULT_HARDWARE, LANE_NAME } from "../data/session";
import { PRODUCT_BY_ID, lookupByCode } from "../data/catalog";
import { findProductByCodeLive } from "../data/live-lookup";
import { computeTotals, describeLine, lineNet } from "../money";
import type {
  CartLine,
  CartTotals,
  Cents,
  HardwareStatus,
  LoyaltyMember,
  Product,
  ScaleReading,
  TenderEntry,
  TenderKind,
} from "../types";

/* ------------------------------------------------------------------ state */

export interface HeldCart {
  id: string;
  label: string;
  lines: CartLine[];
  member: LoyaltyMember | null;
  heldAt: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone: "success" | "warning" | "error";
}

export interface PosState {
  lane: string;
  orderNumber: string;
  lines: CartLine[];
  /** Cart line currently showing its inline Void / Qty / Override bar. */
  selectedLineId: string | null;
  member: LoyaltyMember | null;
  scale: ScaleReading;
  hardware: HardwareStatus;
  tenders: TenderEntry[];
  heldCarts: HeldCart[];
  toast: ToastMessage | null;
  /** Set once the transaction settles, so the receipt modal can render. */
  lastReceipt: {
    totalCents: Cents;
    tenders: TenderEntry[];
    changeCents: Cents;
    orderNumber: string;
  } | null;
}

type Action =
  | { type: "add-product"; product: Product; qty?: number; weightLb?: number; tareLb?: number }
  | { type: "add-line"; line: CartLine }
  | { type: "select-line"; id: string | null }
  | { type: "void-line"; id: string }
  | { type: "change-qty"; id: string; delta: number }
  | { type: "set-qty"; id: string; qty: number }
  | { type: "override-price"; id: string; cents: Cents }
  | { type: "set-member"; member: LoyaltyMember | null }
  | { type: "apply-reward" }
  | { type: "set-scale"; reading: Partial<ScaleReading> }
  | { type: "set-hardware"; patch: Partial<HardwareStatus> }
  | { type: "add-tender"; tender: TenderEntry }
  | { type: "clear-tenders" }
  | { type: "hold-cart" }
  | { type: "recall-cart"; id: string }
  | { type: "complete"; changeCents: Cents }
  | { type: "new-cart" }
  | { type: "toast"; toast: ToastMessage | null };

function newOrderNumber(): string {
  return `${88_000 + Math.floor(Math.random() * 900)}-L04`;
}

const initialState: PosState = {
  lane: LANE_NAME,
  orderNumber: "88392-L04",
  lines: DEMO_CART,
  selectedLineId: "l-3",
  member: DEMO_MEMBER,
  scale: { grossLb: 2.36, tareLb: 0.02, stable: true },
  hardware: DEFAULT_HARDWARE,
  tenders: [],
  heldCarts: [],
  toast: null,
  lastReceipt: null,
};

let lineSeq = 100;
const nextLineId = () => `l-${++lineSeq}`;

function codeLabelFor(product: Product): string {
  if (product.plu) return `PLU ${product.plu}`;
  if (product.upc) return `UPC ${product.upc}`;
  if (product.sku) return `SKU ${product.sku}`;
  return product.department;
}

/** Builds a cart line from a catalog product plus a qty or a weight. */
export function buildLine(
  product: Product,
  opts: { qty?: number; weightLb?: number; tareLb?: number } = {},
): CartLine {
  const isScale = product.pricingMode === "scale";
  const qty = opts.qty ?? 1;
  const weightLb = isScale ? Math.max(0, opts.weightLb ?? 1) : undefined;

  const draft = {
    pricingMode: product.pricingMode,
    qty,
    unitPrice: product.unitPrice,
    weightLb,
    tareLb: opts.tareLb,
  };

  return {
    id: nextLineId(),
    productId: product.id,
    name: product.name,
    unitPrice: product.unitPrice,
    unitLabel: product.unitLabel,
    pricingMode: product.pricingMode,
    qty,
    weightLb,
    tareLb: opts.tareLb,
    taxFlag: product.taxFlag,
    ebtEligible: product.ebtEligible,
    depositCents: product.depositCents,
    detail: describeLine(draft, codeLabelFor(product)),
  };
}

/** Re-renders a line's grey detail text after a qty or weight edit. */
function redescribe(line: CartLine): CartLine {
  const product = PRODUCT_BY_ID.get(line.productId);
  const codeLabel = product ? codeLabelFor(product) : "";
  return { ...line, detail: describeLine(line, codeLabel) };
}

function reducer(state: PosState, action: Action): PosState {
  switch (action.type) {
    case "add-product": {
      const line = buildLine(action.product, {
        qty: action.qty,
        weightLb: action.weightLb,
        tareLb: action.tareLb,
      });
      return { ...state, lines: [...state.lines, line], selectedLineId: line.id };
    }

    case "add-line":
      return { ...state, lines: [...state.lines, action.line], selectedLineId: action.line.id };

    case "select-line":
      return { ...state, selectedLineId: action.id };

    case "void-line":
      return {
        ...state,
        lines: state.lines.map((l) => (l.id === action.id ? { ...l, voided: true } : l)),
        selectedLineId: state.selectedLineId === action.id ? null : state.selectedLineId,
      };

    case "change-qty":
    case "set-qty": {
      return {
        ...state,
        lines: state.lines.map((l) => {
          if (l.id !== action.id) return l;
          const qty =
            action.type === "set-qty"
              ? Math.max(1, action.qty)
              : Math.max(1, l.qty + action.delta);
          return redescribe({ ...l, qty });
        }),
      };
    }

    case "override-price":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.id ? { ...l, overridePrice: action.cents } : l,
        ),
      };

    case "set-member":
      return { ...state, member: action.member };

    case "apply-reward": {
      if (!state.member || state.member.rewardAvailable <= 0) return state;
      if ((state.member.couponsApplied ?? []).length > 0) return state;
      return {
        ...state,
        member: {
          ...state.member,
          couponsApplied: [
            { label: "Member reward", amount: state.member.rewardAvailable },
          ],
        },
      };
    }

    case "set-scale":
      return { ...state, scale: { ...state.scale, ...action.reading } };

    case "set-hardware":
      return { ...state, hardware: { ...state.hardware, ...action.patch } };

    case "add-tender":
      return { ...state, tenders: [...state.tenders, action.tender] };

    case "clear-tenders":
      return { ...state, tenders: [] };

    case "hold-cart": {
      if (state.lines.length === 0) return state;
      const held: HeldCart = {
        id: `hold-${Date.now().toString(36)}`,
        label: `${state.lines.filter((l) => !l.voided).length} items • ${state.member?.name ?? "Guest"}`,
        lines: state.lines,
        member: state.member,
        heldAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      return {
        ...state,
        heldCarts: [held, ...state.heldCarts],
        lines: [],
        member: null,
        selectedLineId: null,
        tenders: [],
        orderNumber: newOrderNumber(),
      };
    }

    case "recall-cart": {
      const held = state.heldCarts.find((h) => h.id === action.id);
      if (!held) return state;
      return {
        ...state,
        lines: held.lines,
        member: held.member,
        heldCarts: state.heldCarts.filter((h) => h.id !== action.id),
        selectedLineId: null,
      };
    }

    case "complete": {
      const totals = computeTotals(state.lines, state.member);
      return {
        ...state,
        lastReceipt: {
          totalCents: totals.total,
          tenders: state.tenders,
          changeCents: action.changeCents,
          orderNumber: state.orderNumber,
        },
        hardware: { ...state.hardware, drawerOpen: true },
      };
    }

    case "new-cart":
      return {
        ...initialState,
        lane: state.lane,
        hardware: { ...state.hardware, drawerOpen: false },
        heldCarts: state.heldCarts,
        lines: [],
        member: null,
        selectedLineId: null,
        tenders: [],
        lastReceipt: null,
        orderNumber: newOrderNumber(),
      };

    case "toast":
      return { ...state, toast: action.toast };

    default:
      return state;
  }
}

/* ---------------------------------------------------------------- context */

export interface PosContextValue extends PosState {
  totals: CartTotals;
  /** Total still owed after any tenders already applied. */
  balanceDue: Cents;
  amountTendered: Cents;

  addProduct(product: Product, opts?: { qty?: number; weightLb?: number; tareLb?: number }): void;
  addLine(line: CartLine): void;
  /** Scanner / PLU entry. Returns the matched product, or null if unknown. */
  scanCode(code: string): Promise<Product | null>;
  selectLine(id: string | null): void;
  voidLine(id: string): void;
  changeQty(id: string, delta: number): void;
  setQty(id: string, qty: number): void;
  overridePrice(id: string, cents: Cents): void;
  setMember(member: LoyaltyMember | null): void;
  applyReward(): void;
  setScale(reading: Partial<ScaleReading>): void;
  setHardware(patch: Partial<HardwareStatus>): void;
  addTender(kind: TenderKind, amount: Cents, tendered?: Cents): void;
  clearTenders(): void;
  holdCart(): void;
  recallCart(id: string): void;
  completeTransaction(changeCents: Cents): void;
  newCart(): void;
  showToast(toast: Omit<ToastMessage, "id">): void;
  lineTotal(line: CartLine): Cents;
}

const PosContext = createContext<PosContextValue | null>(null);

export function PosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const totals = useMemo(() => computeTotals(state.lines, state.member), [state.lines, state.member]);

  const amountTendered = useMemo(
    () => state.tenders.reduce((sum, t) => sum + t.amount, 0),
    [state.tenders],
  );
  const balanceDue = Math.max(0, totals.total - amountTendered);

  // Auto-dismiss the toast, matching the design's 2.4s micro-interaction.
  useEffect(() => {
    if (!state.toast) return;
    const timer = setTimeout(() => dispatch({ type: "toast", toast: null }), 2400);
    return () => clearTimeout(timer);
  }, [state.toast]);

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    dispatch({ type: "toast", toast: { ...toast, id: `t-${Date.now()}` } });
  }, []);

  const scanCode = useCallback(
    async (code: string): Promise<Product | null> => {
      // The seeded demo catalog is checked first (synchronous, no network);
      // anything added later through Manage Products only exists in
      // Supabase, so a miss here falls back to a live lookup before giving up.
      const product = lookupByCode(code) ?? (await findProductByCodeLive(code));
      if (!product) {
        showToast({ title: "Item not found", detail: `No catalog match for "${code}"`, tone: "error" });
        return null;
      }
      if (product.pricingMode === "scale") {
        // A weighed item needs the scale, so route the cashier to the PLU dock.
        showToast({
          title: `${product.name} requires the scale`,
          detail: "Open Produce PLU Lookup to capture weight",
          tone: "warning",
        });
        return product;
      }
      dispatch({ type: "add-product", product, qty: 1 });
      showToast({ title: `Added ${product.name}`, detail: codeLabelFor(product), tone: "success" });
      return product;
    },
    [showToast],
  );

  const value = useMemo<PosContextValue>(
    () => ({
      ...state,
      totals,
      balanceDue,
      amountTendered,
      addProduct: (product, opts) => dispatch({ type: "add-product", product, ...opts }),
      addLine: (line) => dispatch({ type: "add-line", line }),
      scanCode,
      selectLine: (id) => dispatch({ type: "select-line", id }),
      voidLine: (id) => dispatch({ type: "void-line", id }),
      changeQty: (id, delta) => dispatch({ type: "change-qty", id, delta }),
      setQty: (id, qty) => dispatch({ type: "set-qty", id, qty }),
      overridePrice: (id, cents) => dispatch({ type: "override-price", id, cents }),
      setMember: (member) => dispatch({ type: "set-member", member }),
      applyReward: () => dispatch({ type: "apply-reward" }),
      setScale: (reading) => dispatch({ type: "set-scale", reading }),
      setHardware: (patch) => dispatch({ type: "set-hardware", patch }),
      addTender: (kind, amount, tendered) =>
        dispatch({
          type: "add-tender",
          tender: {
            id: `tn-${Date.now().toString(36)}`,
            kind,
            amount,
            tendered,
            changeGiven: tendered !== undefined ? Math.max(0, tendered - amount) : undefined,
            at: new Date().toISOString(),
          },
        }),
      clearTenders: () => dispatch({ type: "clear-tenders" }),
      holdCart: () => dispatch({ type: "hold-cart" }),
      recallCart: (id) => dispatch({ type: "recall-cart", id }),
      completeTransaction: (changeCents) => dispatch({ type: "complete", changeCents }),
      newCart: () => dispatch({ type: "new-cart" }),
      showToast,
      lineTotal: lineNet,
    }),
    [state, totals, balanceDue, amountTendered, scanCode, showToast],
  );

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePos(): PosContextValue {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used inside <PosProvider>");
  return ctx;
}
