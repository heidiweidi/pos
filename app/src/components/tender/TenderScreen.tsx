"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CashPad } from "./CashPad";
import { ReceiptModal } from "./ReceiptModal";
import { TenderMethodGrid } from "./TenderMethodGrid";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { TAX_RATE, formatMoney, lineNet } from "@/lib/money";
import { usePos } from "@/lib/store/pos-store";
import type { TenderKind } from "@/lib/types";

export function TenderScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const {
    lines,
    member,
    totals,
    tenders,
    amountTendered,
    balanceDue,
    orderNumber,
    hardware,
    lastReceipt,
    addTender,
    clearTenders,
    completeTransaction,
    newCart,
    setHardware,
    showToast,
  } = usePos();

  const [method, setMethod] = useState<TenderKind>("cash");
  const [receipts, setReceipts] = useState({ paper: true, email: true, sms: false });

  /*
   * The cash field is seeded once, during the first render, from either the
   * "Fast $50"/"Exact" shortcut the register passed as ?cash= or the balance
   * due. Both are known synchronously, so this needs no effect — and seeding in
   * an initialiser means a cashier's own edits are never overwritten later.
   */
  const [cashInput, setCashInput] = useState(() => {
    const preset = Number.parseInt(params.get("cash") ?? "", 10);
    if (Number.isFinite(preset) && preset > 0) return (preset / 100).toFixed(2);
    return balanceDue > 0 ? (balanceDue / 100).toFixed(2) : "";
  });

  const cashCents = useMemo(() => {
    const value = Number.parseFloat(cashInput.replace(/[^0-9.]/g, ""));
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
  }, [cashInput]);

  const changeDue = Math.max(0, cashCents - balanceDue);
  const progressPct = totals.total > 0 ? Math.min(100, (amountTendered / totals.total) * 100) : 0;
  const ebtPaid = tenders
    .filter((t) => t.kind === "ebt_snap")
    .reduce((sum, t) => sum + t.amount, 0);
  const ebtPct = totals.total > 0 ? (ebtPaid / totals.total) * 100 : 0;

  const activeLines = lines.filter((l) => !l.voided);

  const captionFor = (kind: TenderKind): string => {
    if (kind === "cash") return `Tender ${formatMoney(cashCents)} Cash • [Enter]`;
    if (kind === "card") return `Charge ${formatMoney(balanceDue)} on PIN Pad Card`;
    if (kind === "ebt_snap")
      return `Authorize ${formatMoney(Math.min(totals.ebtEligible, balanceDue))} EBT SNAP Benefit`;
    return `Apply ${formatMoney(balanceDue)} via ${kind.replace("_", " ").toUpperCase()}`;
  };

  const applyEbtSplit = useCallback(() => {
    const share = Math.min(totals.ebtEligible, balanceDue);
    if (share <= 0) {
      showToast({ title: "No SNAP-eligible balance remaining", tone: "warning" });
      return;
    }
    addTender("ebt_snap", share);
    setMethod("card");
    showToast({
      title: `${formatMoney(share)} authorised on EBT`,
      detail: `${formatMoney(balanceDue - share)} remains for a second tender`,
      tone: "success",
    });
  }, [addTender, balanceDue, showToast, totals.ebtEligible]);

  const complete = useCallback(() => {
    if (activeLines.length === 0) {
      showToast({ title: "Cart is empty", tone: "warning" });
      return;
    }

    let change = 0;
    if (balanceDue > 0) {
      if (method === "cash") {
        if (cashCents < balanceDue) {
          showToast({
            title: "Insufficient cash tendered",
            detail: `${formatMoney(balanceDue - cashCents)} short`,
            tone: "error",
          });
          return;
        }
        addTender("cash", balanceDue, cashCents);
        change = cashCents - balanceDue;
      } else {
        addTender(method, balanceDue);
      }
    }

    setHardware({ drawerOpen: method === "cash" });
    completeTransaction(change);
  }, [
    activeLines.length,
    addTender,
    balanceDue,
    cashCents,
    completeTransaction,
    method,
    setHardware,
    showToast,
  ]);

  const voidPayment = () => {
    if (!window.confirm("Cancel and reset the current payment tender sequence?")) return;
    clearTenders();
    setMethod("cash");
    setCashInput((totals.total / 100).toFixed(2));
  };

  // Register hotkeys for the tender screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (lastReceipt) {
        if (event.key === "Enter") {
          event.preventDefault();
          newCart();
          router.push("/register");
        }
        return;
      }
      if (event.key === "F5") {
        event.preventDefault();
        setMethod("card");
      } else if (event.key === "F6") {
        event.preventDefault();
        setMethod("cash");
      } else if (event.key === "F8") {
        event.preventDefault();
        setMethod("ebt_cash");
      } else if (event.key === "F9") {
        event.preventDefault();
        setHardware({ drawerOpen: true });
        showToast({ title: "Drawer kick fired", detail: "TM-T88VI [DK Pin 2]", tone: "warning" });
      } else if (event.key === "Escape") {
        event.preventDefault();
        router.push("/register");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastReceipt, newCart, router, setHardware, showToast]);

  return (
    <div className="p-space-md max-w-[1920px] mx-auto w-full">
      {/* Breadcrumb + split progress */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-sm bg-surface-container-lowest p-space-sm rounded-xl shadow-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
            <Icon name="payments" />
          </div>
          <div>
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                Payment &amp; Tender Settlement
              </span>
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                Order #{orderNumber}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Select tender method or configure multi-way payment split
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-space-xs rounded-xl min-w-[320px]">
          <div className="flex-1">
            <div className="flex justify-between font-label-sm text-label-sm mb-1">
              <span className="text-on-surface-variant">Tender Progress</span>
              <span className="text-primary font-bold">
                {formatMoney(amountTendered)} of {formatMoney(totals.total)} (
                {Math.round(progressPct)}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden flex">
              <div
                className="h-full bg-tertiary transition-all duration-300"
                style={{ width: `${ebtPct}%` }}
              />
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(0, progressPct - ebtPct)}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyEbtSplit}
            className="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm transition-colors flex items-center gap-1"
          >
            <Icon name="call_split" className="text-sm" />
            <span>Split Tender</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* LEFT: totals, breakdown, manifest, member */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="bg-inverse-surface text-inverse-on-surface p-space-md rounded-xl shadow-md relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-primary/10 pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="font-label-md text-label-md tracking-wider text-primary-fixed uppercase">
                Total Amount Due
              </span>
              <span className="px-space-xs py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim animate-ping" /> Live Cart
              </span>
            </div>
            <div className="mt-space-xs flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-numeric-hero font-bold tracking-tight text-surface-bright">
                {formatMoney(totals.total)}
              </span>
              <span className="font-label-sm text-label-sm text-inverse-on-surface/70">USD</span>
            </div>
            <div className="mt-space-xs pt-space-xs border-t border-inverse-on-surface/20 flex items-center justify-between font-body-sm text-body-sm text-inverse-on-surface/90">
              <span>Remaining Unpaid Balance:</span>
              <span className="font-numeric-md text-numeric-md font-bold text-primary-fixed">
                {formatMoney(balanceDue)}
              </span>
            </div>
          </div>

          {/* Tax & SNAP breakdown */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-low mb-space-xs">
              <span className="font-label-md text-label-md text-on-surface flex items-center gap-1">
                <Icon name="receipt_long" className="text-primary text-base" />
                Subtotal &amp; Tax Breakdown
              </span>
              <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed">
                USDA SNAP Approved
              </span>
            </div>
            <div className="space-y-space-xs font-body-sm text-body-sm">
              <BreakdownRow
                dot="bg-primary"
                label="SNAP / EBT Food Eligible:"
                value={formatMoney(totals.ebtEligible)}
                bold
              />
              <BreakdownRow
                dot="bg-secondary"
                label="Non-SNAP Taxable Items:"
                value={formatMoney(totals.nonEbtTaxable)}
                bold
              />
              <BreakdownRow
                label={`State Sales Tax (${(TAX_RATE * 100).toFixed(2)}%):`}
                value={formatMoney(totals.tax)}
                indent
              />
              <BreakdownRow
                label="Bottle Deposit:"
                value={formatMoney(totals.deposits)}
                indent
              />
              {totals.discounts > 0 ? (
                <div className="flex justify-between items-center py-1 bg-surface-container-low px-space-xs rounded">
                  <span className="text-primary font-semibold flex items-center gap-1">
                    <Icon name="local_offer" className="text-base" /> Loyalty Member Saving:
                  </span>
                  <span className="font-numeric-md text-numeric-md text-primary font-bold">
                    -{formatMoney(totals.discounts)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Cart manifest */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-md text-label-md text-on-surface">Cart Manifest</span>
                <span className="px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                  {totals.itemCount} items
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="text-primary hover:text-primary-container font-label-sm text-label-sm"
              >
                Inspect All
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto pos-scroll pr-1 divide-y divide-surface-container-low">
              {activeLines.map((line) => (
                <div key={line.id} className="flex items-center justify-between py-1.5 gap-space-xs">
                  <div className="flex items-center gap-space-xs min-w-0">
                    <span className="w-5 h-5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center justify-center font-bold shrink-0">
                      {line.pricingMode === "scale" ? "⚖" : line.qty}
                    </span>
                    <div className="truncate">
                      <div className="font-body-md text-body-md text-on-surface truncate font-medium">
                        {line.name}
                      </div>
                      <span
                        className={`font-label-sm text-label-sm ${
                          line.ebtEligible ? "text-primary" : "text-secondary"
                        }`}
                      >
                        {line.ebtEligible ? "EBT Eligible" : "Non-SNAP Taxable"}
                        {line.depositCents ? ` + ${formatMoney(line.depositCents)} Dep` : ""}
                      </span>
                    </div>
                  </div>
                  <span className="font-numeric-md text-numeric-md text-on-surface shrink-0 font-medium">
                    {formatMoney(lineNet(line))}
                  </span>
                </div>
              ))}
              {activeLines.length === 0 ? (
                <p className="py-space-md text-center font-body-sm text-body-sm text-on-surface-variant">
                  No items in this cart.
                </p>
              ) : null}
            </div>
          </div>

          {/* Member */}
          {member ? (
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center gap-space-sm">
              <Avatar
                name={member.name}
                className="w-12 h-12 rounded-full shadow-sm"
                textClassName="text-label-lg font-label-lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                    {member.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                    {member.tier} Member
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  Acct #{member.accountNumber} • {member.points} Apex Points Available
                </p>
                {(member.couponsApplied ?? []).length > 0 ? (
                  <div className="flex items-center gap-1 text-primary font-label-sm text-label-sm mt-0.5">
                    <Icon name="check_circle" className="text-sm" />
                    <span>
                      {member.couponsApplied!.length} Digital Coupon Applied (-
                      {formatMoney(member.couponsApplied!.reduce((s, c) => s + c.amount, 0))})
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* CENTRE: method grid + workspace */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <TenderMethodGrid
            active={method}
            maxEbt={totals.ebtEligible}
            onSelect={(kind) => {
              setMethod(kind);
              if (!["cash", "card", "ebt_snap"].includes(kind)) {
                showToast({
                  title: `${kind.replace("_", " ").toUpperCase()} selected`,
                  detail: "Ready for card swipe or voucher entry",
                  tone: "success",
                });
              }
            }}
          />

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
            {method === "cash" ? (
              <CashPad
                value={cashInput}
                onChange={setCashInput}
                balanceDue={balanceDue}
                changeDue={changeDue}
                onAccept={complete}
              />
            ) : null}

            {method === "card" ? (
              <div className="flex flex-col gap-space-sm text-center py-space-md">
                <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <Icon name="contactless" className="text-3xl" />
                </div>
                <span className="font-headline-md text-headline-md text-on-surface font-bold">
                  Lane 04 Terminal PIN Pad Active
                </span>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
                  Customer prompting: &ldquo;Insert Chip, Swipe, or Hold Phone Near Contactless
                  Symbol&rdquo;
                </p>
                <div className="inline-flex items-center justify-center gap-2 bg-surface-container-high px-space-md py-space-xs rounded-full mx-auto font-label-sm text-label-sm text-on-surface">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hardware.pinPadReady ? "bg-primary animate-pulse" : "bg-error"
                    }`}
                  />
                  Verifone MX925 Connected • Encrypted End-to-End
                </div>
              </div>
            ) : null}

            {method === "ebt_snap" ? (
              <div className="flex flex-col gap-space-sm">
                <div className="p-space-sm bg-tertiary-container text-on-tertiary-container rounded-xl flex items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="shopping_basket" className="text-2xl" />
                    <div className="min-w-0">
                      <div className="font-label-lg text-label-lg font-bold">
                        USDA SNAP Food Eligible Tender
                      </div>
                      <div className="font-body-sm text-body-sm opacity-90">
                        Only eligible food items will be deducted
                      </div>
                    </div>
                  </div>
                  <span className="font-numeric-lg text-numeric-lg font-bold shrink-0">
                    {formatMoney(totals.ebtEligible)}
                  </span>
                </div>
                <div className="p-space-sm bg-surface-container-low rounded-xl text-on-surface space-y-1">
                  <div className="flex justify-between font-body-sm text-body-sm">
                    <span>Eligible Cart Charge:</span>
                    <span className="font-semibold text-primary">
                      {formatMoney(Math.min(totals.ebtEligible, balanceDue))} (EBT Balance)
                    </span>
                  </div>
                  <div className="flex justify-between font-body-sm text-body-sm">
                    <span>Remaining Non-Food Balance:</span>
                    <span className="font-semibold text-error">
                      {formatMoney(Math.max(0, balanceDue - totals.ebtEligible))} (Requires
                      Card/Cash)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={applyEbtSplit}
                  className="w-full h-12 rounded-lg bg-tertiary text-on-tertiary hover:opacity-90 font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 px-space-sm text-center"
                >
                  <Icon name="check" />
                  <span className="truncate">
                    Authorize {formatMoney(Math.min(totals.ebtEligible, balanceDue))} on EBT &amp;
                    keep {formatMoney(Math.max(0, balanceDue - totals.ebtEligible))} for 2nd tender
                  </span>
                </button>
              </div>
            ) : null}

            {["ebt_cash", "gift", "wic"].includes(method) ? (
              <div className="flex flex-col items-center gap-space-sm py-space-lg text-center">
                <Icon name="credit_score" className="text-4xl text-primary" />
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Awaiting {method === "wic" ? "voucher" : "card"} entry
                </span>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                  {formatMoney(balanceDue)} will be applied on authorisation. Complete the tender to
                  settle this balance.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT: hardware, receipts, complete */}
        <div className="lg:col-span-3 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface">Lane Station Status</span>
              <span className="flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold">
                <span className="w-2 h-2 rounded-full bg-primary" /> Ready
              </span>
            </div>
            <div className="bg-surface-container-low p-space-sm rounded-lg space-y-1 font-body-sm text-body-sm">
              <StationRow
                icon="meeting_room"
                label="Drawer:"
                value={`Lane 04 (${hardware.drawerOpen ? "Open" : "Closed & Armed"})`}
              />
              <StationRow
                icon="print"
                label="Receipt:"
                value={`Epson Thermal (${hardware.printerPaperPercent}% Roll)`}
              />
              <StationRow icon="terminal" label="PIN Pad:" value="Verifone Ready" />
            </div>
            <button
              type="button"
              onClick={() => {
                setHardware({ drawerOpen: true });
                showToast({
                  title: "Drawer kick fired",
                  detail: "Epson TM-T88VI [DK Pin 2]",
                  tone: "warning",
                });
              }}
              className="w-full py-2 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Icon name="lock_open" className="text-base" />
              <span>Open Drawer Manual Key [F9]</span>
            </button>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <span className="font-label-md text-label-md text-on-surface block mb-space-xs">
              Receipt Options
            </span>
            <div className="space-y-2 font-body-sm text-body-sm">
              <ReceiptToggle
                checked={receipts.paper}
                onChange={(v) => setReceipts((r) => ({ ...r, paper: v }))}
                title="Print Paper Receipt"
                subtitle="Epson TM-T88VI Printer"
              />
              <ReceiptToggle
                checked={receipts.email}
                onChange={(v) => setReceipts((r) => ({ ...r, email: v }))}
                title="Email e-Receipt"
                subtitle={member?.email ?? "No email on file"}
              />
              <ReceiptToggle
                checked={receipts.sms}
                onChange={(v) => setReceipts((r) => ({ ...r, sms: v }))}
                title="SMS Text Receipt"
                subtitle={member?.phone ?? "No number on file"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-space-xs">
            <button
              type="button"
              onClick={complete}
              className="w-full h-20 rounded-xl bg-primary hover:bg-primary-container text-on-primary shadow-lg flex flex-col items-center justify-center transition-all active:scale-95 group px-space-sm"
            >
              <div className="flex items-center gap-2 font-headline-sm text-headline-sm font-bold tracking-wide">
                <Icon name="verified" className="text-2xl group-hover:scale-110 transition-transform" />
                <span>COMPLETE TENDER</span>
              </div>
              <span className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-wider font-semibold truncate max-w-full">
                {captionFor(method)}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-space-xs mt-1">
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="py-2.5 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-1"
              >
                <Icon name="arrow_back" className="text-base" />
                <span>Cart [Esc]</span>
              </button>
              <button
                type="button"
                onClick={voidPayment}
                className="py-2.5 px-space-sm rounded-lg bg-error-container hover:bg-error/20 text-on-error-container font-label-md text-label-md transition-colors flex items-center justify-center gap-1"
              >
                <Icon name="cancel" className="text-base" />
                <span>Void Pay</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReceiptModal
        receipt={lastReceipt}
        onNext={() => {
          newCart();
          router.push("/register");
        }}
      />
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  dot,
  indent,
  bold,
}: {
  label: string;
  value: string;
  dot?: string;
  indent?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className={`text-on-surface-variant flex items-center gap-1 ${indent ? "pl-3" : ""}`}>
        {dot ? <span className={`w-2 h-2 rounded-full ${dot}`} /> : null}
        {label}
      </span>
      <span
        className={`font-numeric-md text-numeric-md text-on-surface ${bold ? "font-semibold" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function StationRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-space-xs">
      <span className="text-on-surface-variant flex items-center gap-1 shrink-0">
        <Icon name={icon} className="text-base text-primary" /> {label}
      </span>
      <span className="font-medium text-on-surface truncate text-right">{value}</span>
    </div>
  );
}

function ReceiptToggle({
  checked,
  onChange,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  subtitle: string;
}) {
  return (
    <label className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-[#006948] focus:ring-primary"
      />
      <div className="min-w-0">
        <div className="font-label-md text-label-md text-on-surface font-medium">{title}</div>
        <div className="font-body-sm text-body-sm text-on-surface-variant truncate">{subtitle}</div>
      </div>
    </label>
  );
}
