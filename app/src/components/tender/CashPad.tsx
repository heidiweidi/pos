"use client";

import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";

/** Rounds a balance up to the next common bill, for the quick-preset row. */
function nextBill(balanceCents: number, bill: number): number {
  return Math.ceil(balanceCents / bill) * bill;
}

export function CashPad({
  value,
  onChange,
  balanceDue,
  changeDue,
  onAccept,
}: {
  value: string;
  onChange: (value: string) => void;
  balanceDue: number;
  changeDue: number;
  onAccept: () => void;
}) {
  const presets = [
    { cents: balanceDue, caption: "Exact Cash" },
    { cents: nextBill(balanceDue, 5_000), caption: "$50 Bill" },
    { cents: nextBill(balanceDue, 2_000), caption: "Next $20" },
    { cents: nextBill(balanceDue, 10_000), caption: "$100 Bill" },
  ];

  const press = (key: string) => {
    if (key === "C") {
      onChange("");
      return;
    }
    if (key === "+10" || key === "+20") {
      const add = key === "+10" ? 10 : 20;
      const current = Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
      onChange((current + add).toFixed(2));
      return;
    }
    if (key === "." && value.includes(".")) return;
    onChange(value + key);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-space-sm">
        <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
          <Icon name="calculate" className="text-primary" /> Cash Tender Entry
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Quick preset bills or enter exact cash
        </span>
      </div>

      {/* Preset bills */}
      <div className="grid grid-cols-4 gap-space-xs">
        {presets.map((preset, index) => (
          <button
            key={`${preset.caption}-${index}`}
            type="button"
            onClick={() => onChange((preset.cents / 100).toFixed(2))}
            className="h-12 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary transition-all font-numeric-md text-numeric-md font-bold text-on-surface flex flex-col items-center justify-center"
          >
            <span>{formatMoney(preset.cents)}</span>
            <span className="text-[10px] font-normal leading-none">{preset.caption}</span>
          </button>
        ))}
      </div>

      {/* Tendered + change due */}
      <div className="grid grid-cols-2 gap-space-sm items-stretch">
        <div className="bg-surface-container-low p-space-sm rounded-xl">
          <label
            htmlFor="cash-tendered"
            className="font-label-sm text-label-sm text-on-surface-variant block mb-1"
          >
            Cash Tendered ($)
          </label>
          <input
            id="cash-tendered"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            className="w-full bg-surface-container-lowest text-on-surface font-numeric-lg text-numeric-lg font-bold px-space-sm py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-primary text-right"
            type="text"
          />
        </div>
        <div className="bg-primary-container text-on-primary-container p-space-sm rounded-xl shadow-sm text-center flex flex-col justify-center">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">
            Change Due Customer
          </span>
          <span className="font-numeric-hero text-headline-xl font-bold tracking-tight">
            {formatMoney(changeDue)}
          </span>
        </div>
      </div>

      {/* Touch keypad */}
      <div className="grid grid-cols-4 gap-space-xs mt-1">
        {[
          ["1", "2", "3", "+10"],
          ["4", "5", "6", "+20"],
          ["7", "8", "9", "C"],
          ["0", "00", ".", "ACCEPT"],
        ]
          .flat()
          .map((key) => {
            if (key === "ACCEPT") {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={onAccept}
                  className="h-12 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold transition-colors"
                >
                  ACCEPT
                </button>
              );
            }
            if (key === "C") {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => press("C")}
                  className="h-12 rounded-lg bg-error-container hover:bg-error/20 font-label-md text-label-md font-bold text-on-error-container transition-colors"
                >
                  CLR
                </button>
              );
            }
            if (key.startsWith("+")) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  className="h-12 rounded-lg bg-surface-container-high hover:bg-surface-variant font-label-md text-label-md font-bold text-on-surface transition-colors"
                >
                  {key.replace("+", "+$")}
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                className="h-12 rounded-lg bg-surface-container-low hover:bg-surface-container font-headline-sm text-headline-sm font-bold text-on-surface transition-colors"
              >
                {key}
              </button>
            );
          })}
      </div>
    </>
  );
}
