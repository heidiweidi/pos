"use client";

import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import type { Denomination } from "@/lib/types";

/** Cash drawer reconciliation: expected-balance formula, denomination grid, variance. */
export function DrawerCount({
  denominations,
  counts,
  onChange,
  onRecount,
  openingFloat,
  cashSales,
  dropTotal,
  dropCount,
  expected,
  counted,
  variance,
}: {
  denominations: Denomination[];
  counts: Record<string, number>;
  onChange: (id: string, value: number) => void;
  onRecount: () => void;
  openingFloat: number;
  cashSales: number;
  dropTotal: number;
  dropCount: number;
  expected: number;
  counted: number;
  variance: number;
}) {
  const balanced = variance === 0;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
      <div className="flex items-center justify-between pb-space-sm gap-space-sm">
        <div className="flex items-center gap-space-xs">
          <Icon name="account_balance_wallet" className="text-primary text-xl" />
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Cash Drawer Reconciliation &amp; Float Audit
          </h2>
        </div>
        <span className="font-label-sm text-label-sm bg-surface-container text-on-surface-variant px-space-xs py-1 rounded whitespace-nowrap">
          Shift Close Audit
        </span>
      </div>

      {/* Expected-balance formula bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-xs my-space-sm p-space-xs bg-surface-container-low rounded-lg text-center">
        <FormulaCell label="Opening Float" value={formatMoney(openingFloat)} />
        <FormulaCell
          label="+ Cash Sales"
          value={`+${formatMoney(cashSales)}`}
          valueClass="text-primary"
        />
        <FormulaCell
          label={`- Safe Drops (${dropCount})`}
          value={`-${formatMoney(dropTotal)}`}
          valueClass="text-error"
        />
        <FormulaCell
          label="Expected Balance"
          value={formatMoney(expected)}
          highlight
          valueClass="font-bold"
        />
      </div>

      {/* Denomination rows */}
      <div className="space-y-space-xs pt-space-xs">
        <div className="flex justify-between items-center px-space-xs py-1 text-on-surface-variant font-label-sm text-label-sm">
          <span>Bill / Coin Denomination</span>
          <div className="flex items-center gap-space-xl">
            <span className="w-20 text-center">Count / Qty</span>
            <span className="w-24 text-right">Subtotal</span>
          </div>
        </div>

        {denominations.map((denom) => {
          const entered = counts[denom.id] ?? 0;
          const subtotal = denom.valueCents === null ? entered : entered * denom.valueCents;
          const isCoin = denom.valueCents === null;

          return (
            <div
              key={denom.id}
              className="flex items-center justify-between p-space-xs rounded bg-surface hover:bg-surface-container-low transition-colors gap-space-sm"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <span
                  className={`w-10 h-7 rounded font-numeric-md text-numeric-md flex items-center justify-center font-bold shrink-0 ${
                    isCoin
                      ? "bg-secondary-container text-on-secondary-fixed"
                      : "bg-primary-container/15 text-primary"
                  }`}
                >
                  {denom.chip}
                </span>
                <div className="min-w-0">
                  <span className="font-label-md text-label-md text-on-surface block truncate">
                    {denom.label}
                  </span>
                  <span className="block font-body-sm text-body-sm text-outline truncate">
                    {denom.sublabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-space-md shrink-0">
                <input
                  type="number"
                  min={0}
                  step={isCoin ? 0.05 : 1}
                  value={isCoin ? (entered / 100).toFixed(2) : entered}
                  onChange={(e) => {
                    const raw = Number.parseFloat(e.target.value);
                    if (!Number.isFinite(raw) || raw < 0) {
                      onChange(denom.id, 0);
                      return;
                    }
                    onChange(denom.id, isCoin ? Math.round(raw * 100) : Math.floor(raw));
                  }}
                  aria-label={`${denom.label} count`}
                  className="w-20 h-10 px-space-xs text-center font-numeric-md text-numeric-md bg-surface-container-lowest text-on-surface rounded shadow-sm focus:outline-none focus:bg-surface-container-high transition-all"
                />
                <div className="w-24 text-right font-numeric-md text-numeric-md text-on-surface">
                  {formatMoney(subtotal)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Variance banner */}
      <div className="mt-space-md p-space-md rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md">
        <div className="space-y-0.5 text-center sm:text-left">
          <div className="font-label-md text-label-md text-on-surface-variant">
            Total Counted Physical Cash
          </div>
          <div className="font-numeric-hero text-numeric-hero text-on-surface">
            {formatMoney(counted)}
          </div>
        </div>

        <div className="flex items-center gap-space-md">
          <div className="text-right">
            <div className="font-label-sm text-label-sm text-on-surface-variant">Variance Status</div>
            <div
              className={`font-label-lg text-label-lg flex items-center gap-1 font-bold ${
                balanced ? "text-primary" : "text-error"
              }`}
            >
              <Icon name={balanced ? "check_circle" : "error"} className="text-base" />
              <span>
                {formatMoney(variance)} (
                {balanced ? "Balanced" : variance > 0 ? "Over" : "Short"})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRecount}
            className="h-12 px-space-md bg-surface-container-lowest text-on-surface hover:bg-surface-container rounded-lg shadow-sm font-label-md text-label-md flex items-center gap-space-xs transition-all active:translate-y-0.5"
          >
            <Icon name="restart_alt" className="text-lg" />
            <span>Recount</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FormulaCell({
  label,
  value,
  valueClass = "",
  highlight,
}: {
  label: string;
  value: string;
  valueClass?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-space-xs ${highlight ? "bg-surface-container-high rounded" : ""}`}>
      <div
        className={`font-label-sm text-label-sm ${
          highlight ? "text-on-surface font-semibold" : "text-on-surface-variant"
        }`}
      >
        {label}
      </div>
      <div className={`font-numeric-md text-numeric-md text-on-surface mt-0.5 ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
