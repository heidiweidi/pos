"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { DISCOUNT_LABELS, type DiscountKind } from "@/lib/region";
import { useRegion } from "@/lib/store/region-store";
import { usePos } from "@/lib/store/pos-store";

/** Senior Citizen / PWD discount: the customer's ID is required for the receipt. */
export function DiscountDialog({ onClose }: { onClose: () => void }) {
  const { currency, region } = useRegion();
  const { discount, setDiscount, showToast } = usePos();
  const [kind, setKind] = useState<DiscountKind>(discount?.kind ?? currency.discounts[0] ?? "senior");
  const [idNumber, setIdNumber] = useState(discount?.idNumber ?? "");
  const [holderName, setHolderName] = useState(discount?.holderName ?? "");

  const canApply = idNumber.trim().length > 0 && holderName.trim().length > 0;

  const apply = () => {
    if (!canApply) return;
    setDiscount({ kind, idNumber: idNumber.trim(), holderName: holderName.trim() });
    showToast({ title: `${DISCOUNT_LABELS[kind]} discount applied`, detail: `ID ${idNumber.trim()}`, tone: "success" });
    onClose();
  };

  const field =
    "w-full h-12 px-3 bg-surface-container-low rounded-lg font-label-lg text-label-lg text-on-surface focus:outline-none focus:bg-surface-container-lowest shadow-inner";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Apply customer discount"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-space-md"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-modal max-w-md w-full flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-xs">
          <Icon name="percent" className="text-primary" /> Customer Discount
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {region.seniorPwdPct}% off the VAT-exclusive price, with VAT exempted. Check the customer&apos;s ID before
          applying.
        </p>

        <div className="grid grid-cols-2 gap-space-xs">
          {currency.discounts.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`h-12 rounded-lg font-label-md text-label-md ${
                kind === k ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface"
              }`}
            >
              {DISCOUNT_LABELS[k]}
            </button>
          ))}
        </div>

        <input
          autoFocus
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          className={field}
          placeholder={kind === "senior" ? "OSCA ID number" : "PWD ID number"}
          aria-label="ID number"
        />
        <input
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className={field}
          placeholder="Name on ID"
          aria-label="Name on ID"
        />

        <div className="flex gap-space-xs pt-space-xs">
          {discount ? (
            <button
              type="button"
              onClick={() => {
                setDiscount(null);
                showToast({ title: "Discount removed", tone: "warning" });
                onClose();
              }}
              className="h-12 px-space-md rounded-lg bg-error-container text-on-error-container font-label-md text-label-md"
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-12 px-space-md rounded-lg bg-surface-container text-on-surface font-label-md text-label-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!canApply}
            className="h-12 flex-1 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-50"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
}
