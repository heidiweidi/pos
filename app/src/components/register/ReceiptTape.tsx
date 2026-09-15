"use client";

import { Icon } from "@/components/ui/Icon";
import { formatMoney, formatWeight, lineGross, lineNet, quantityLabel } from "@/lib/money";
import { usePos } from "@/lib/store/pos-store";

/**
 * Left rail: loyalty banner, scrollable scanned-item tape, sticky financial
 * summary with the emerald Total Balance Due box.
 */
export function ReceiptTape() {
  const {
    lines,
    selectedLineId,
    member,
    totals,
    selectLine,
    voidLine,
    changeQty,
    overridePrice,
    applyReward,
    showToast,
  } = usePos();

  const rewardApplied = (member?.couponsApplied ?? []).length > 0;

  const handleOverride = (id: string, currentCents: number) => {
    const input = window.prompt(
      "Supervisor price override — enter the approved unit price:",
      (currentCents / 100).toFixed(2),
    );
    if (input === null) return;
    const cents = Math.round(Number.parseFloat(input.replace(/[^0-9.]/g, "")) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      showToast({ title: "Override rejected", detail: "Enter a valid amount", tone: "error" });
      return;
    }
    overridePrice(id, cents);
    showToast({ title: "Price override applied", detail: formatMoney(cents), tone: "warning" });
  };

  return (
    <div className="col-span-12 lg:col-span-5 flex flex-col h-full bg-surface-container-lowest rounded-xl shadow-md overflow-hidden">
      {/* Loyalty member banner */}
      {member ? (
        <div className="bg-primary-container px-space-md py-space-sm text-on-primary-container flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-8 h-8 rounded-full bg-surface-container-lowest/20 flex items-center justify-center shrink-0">
              <Icon name="verified" className="text-base text-on-primary-container" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-md text-label-md truncate">{member.name}</span>
                <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm px-1.5 rounded font-semibold tracking-wide uppercase">
                  {member.tier}
                </span>
              </div>
              <p className="font-body-sm text-body-sm opacity-90 truncate">
                #{member.accountNumber} • {member.points} Pts •{" "}
                {formatMoney(member.rewardAvailable)} Reward Available
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={applyReward}
            disabled={rewardApplied}
            className="px-space-sm py-1 bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 transition-colors rounded font-label-sm text-label-sm text-on-primary-container whitespace-nowrap disabled:opacity-60"
          >
            {rewardApplied ? "Reward Applied" : `Apply ${formatMoney(member.rewardAvailable)}`}
          </button>
        </div>
      ) : (
        <div className="bg-surface-container-low px-space-md py-space-sm text-on-surface-variant flex items-center gap-space-sm shrink-0 font-label-md text-label-md">
          <Icon name="person_search" className="text-base" />
          No loyalty member attached • Alt+C to look up
        </div>
      )}

      {/* Column header */}
      <div className="grid grid-cols-12 px-space-md py-space-xs bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider shrink-0">
        <div className="col-span-1 text-center">Qty</div>
        <div className="col-span-6 pl-space-xs">Description / Code</div>
        <div className="col-span-2 text-center">Tax</div>
        <div className="col-span-3 text-right pr-1">Total</div>
      </div>

      {/* Scrollable receipt tape */}
      <div className="flex-1 overflow-y-auto pos-scroll text-on-surface" id="cart-item-stream">
        {lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-space-xs text-on-surface-variant p-space-lg text-center">
            <Icon name="barcode_scanner" className="text-4xl text-outline-variant" />
            <p className="font-label-md text-label-md">Cart empty — scan or tap an item to begin</p>
          </div>
        ) : (
          lines.map((line) => {
            const selected = line.id === selectedLineId;
            const gross = lineGross(line);
            const net = lineNet(line);
            const discounted = Boolean(line.discount) || line.overridePrice !== undefined;

            if (selected) {
              return (
                <div
                  key={line.id}
                  className="relative bg-surface-container-high px-space-md py-space-sm cursor-pointer shadow-sm animate-scan-in"
                  onClick={() => selectLine(null)}
                >
                  <div className="grid grid-cols-12 items-center">
                    <div className="col-span-1 text-center font-numeric-md text-numeric-md text-primary">
                      {quantityLabel(line)}
                    </div>
                    <div className="col-span-6 pl-space-xs min-w-0">
                      <div className="flex items-center gap-1">
                        {line.pricingMode === "scale" ? (
                          <Icon name="scale" className="text-sm text-primary" />
                        ) : null}
                        <span
                          className={`font-label-md text-label-md font-bold text-on-surface truncate ${
                            line.voided ? "line-through opacity-60" : ""
                          }`}
                        >
                          {line.name}
                        </span>
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        {line.detail}
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <TaxChip flag={line.taxFlag} />
                    </div>
                    <div className="col-span-3 text-right font-numeric-md text-numeric-md font-bold text-primary pr-1">
                      {formatMoney(net)}
                    </div>
                  </div>

                  {/* Inline quick-modifier bar for the selected row */}
                  <div className="flex items-center justify-between pt-space-xs mt-space-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          voidLine(line.id);
                          showToast({ title: `Voided ${line.name}`, tone: "error" });
                        }}
                        className="flex items-center gap-0.5 px-space-xs py-0.5 bg-error text-on-error rounded font-label-sm text-label-sm hover:opacity-90"
                      >
                        <Icon name="delete" className="text-xs" /> Void
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          changeQty(line.id, 1);
                        }}
                        disabled={line.pricingMode === "scale"}
                        className="flex items-center gap-0.5 px-space-xs py-0.5 bg-surface-container-lowest text-on-surface rounded font-label-sm text-label-sm shadow-sm hover:bg-surface disabled:opacity-50"
                      >
                        <Icon name="add_circle" className="text-xs" /> Qty
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOverride(line.id, gross);
                        }}
                        className="flex items-center gap-0.5 px-space-xs py-0.5 bg-surface-container-lowest text-on-surface rounded font-label-sm text-label-sm shadow-sm hover:bg-surface"
                      >
                        <Icon name="price_change" className="text-xs" /> Override
                      </button>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary font-semibold">
                      Row Selected
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={line.id}
                onClick={() => selectLine(line.id)}
                className="grid grid-cols-12 items-center px-space-md py-space-sm hover:bg-surface-container-low transition-colors cursor-pointer bg-surface-container-lowest"
              >
                <div className="col-span-1 text-center font-numeric-md text-numeric-md">
                  {quantityLabel(line)}
                </div>
                <div className="col-span-6 pl-space-xs min-w-0">
                  <div
                    className={`font-label-md text-label-md truncate text-on-surface ${
                      line.voided ? "line-through opacity-60" : ""
                    }`}
                  >
                    {line.name}
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {line.detail}
                    </span>
                    {line.discount ? (
                      <span className="font-label-sm text-label-sm bg-tertiary text-on-tertiary px-1 rounded shrink-0">
                        {line.discount.label}
                      </span>
                    ) : null}
                    {line.voided ? (
                      <span className="font-label-sm text-label-sm bg-error text-on-error px-1 rounded shrink-0">
                        VOID
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <TaxChip flag={line.taxFlag} />
                </div>
                <div className="col-span-3 text-right font-numeric-md text-numeric-md pr-1">
                  {discounted && !line.voided ? (
                    <span className="line-through text-on-surface-variant text-xs mr-1">
                      {formatMoney(gross)}
                    </span>
                  ) : null}
                  {formatMoney(net)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky financial summary */}
      <div className="bg-surface-container-low p-space-md shadow-[0_-4px_12px_rgba(0,0,0,0.03)] shrink-0 space-y-space-xs">
        <SummaryRow label="Cart Subtotal" value={formatMoney(totals.subtotal)} />
        {totals.discounts > 0 ? (
          <div className="flex justify-between items-center text-primary font-body-sm text-body-sm">
            <span className="flex items-center gap-1">
              <Icon name="loyalty" className="text-sm" /> Loyalty Member Savings
            </span>
            <span className="font-numeric-md text-numeric-md text-primary">
              -{formatMoney(totals.discounts)}
            </span>
          </div>
        ) : null}
        <SummaryRow label="SNAP Food Eligible Portion" value={formatMoney(totals.ebtEligible)} />
        <SummaryRow
          label="Non-Food Tax & Container Dep."
          value={formatMoney(totals.tax + totals.deposits)}
        />

        <div className="bg-primary text-on-primary p-space-md rounded-xl flex items-center justify-between shadow-md mt-space-xs">
          <div>
            <div className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">
              Total Balance Due
            </div>
            <div className="font-body-sm text-body-sm text-on-primary/80">
              {totals.itemCount} Items • {formatWeight(totals.totalWeightLb)} lbs Total
            </div>
          </div>
          <div className="text-right">
            <div className="font-numeric-hero text-numeric-hero leading-none tracking-tight">
              {formatMoney(totals.total)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-on-surface-variant font-body-sm text-body-sm">
      <span>{label}</span>
      <span className="font-numeric-md text-numeric-md text-on-surface">{value}</span>
    </div>
  );
}

function TaxChip({ flag }: { flag: "F" | "T" }) {
  return (
    <span
      className={`font-label-sm text-label-sm px-1 rounded ${
        flag === "T"
          ? "bg-surface-container-high text-on-surface font-bold"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {flag}
    </span>
  );
}
