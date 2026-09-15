"use client";

import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import type { TenderEntry } from "@/lib/types";

export function ReceiptModal({
  receipt,
  onNext,
}: {
  receipt: {
    totalCents: number;
    tenders: TenderEntry[];
    changeCents: number;
    orderNumber: string;
  } | null;
  onNext: () => void;
}) {
  if (!receipt) return null;

  const tenderedLabel =
    receipt.tenders.length === 0
      ? "—"
      : receipt.tenders
          .map((t) => `${formatMoney(t.tendered ?? t.amount)} (${t.kind.replace("_", " ").toUpperCase()})`)
          .join(" + ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Transaction approved"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-space-md"
    >
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-modal border-2 border-surface-container-highest max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mx-auto mb-space-md">
          <Icon name="check_circle" className="text-3xl" />
        </div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
          Transaction Approved
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Order #{receipt.orderNumber} settled. Cash drawer opened; paper receipt printing on
          TM-T88VI.
        </p>

        <div className="my-space-md p-space-sm bg-surface-container-low rounded-xl text-left space-y-1">
          <div className="flex justify-between font-body-sm text-body-sm gap-space-sm">
            <span className="text-on-surface-variant shrink-0">Total Amount:</span>
            <span className="font-bold text-on-surface">{formatMoney(receipt.totalCents)}</span>
          </div>
          <div className="flex justify-between font-body-sm text-body-sm gap-space-sm">
            <span className="text-on-surface-variant shrink-0">Tendered:</span>
            <span className="font-bold text-on-surface text-right">{tenderedLabel}</span>
          </div>
          <div className="flex justify-between font-headline-sm text-headline-sm pt-1 border-t border-surface-container text-primary font-bold">
            <span>Change Returned:</span>
            <span>{formatMoney(receipt.changeCents)}</span>
          </div>
        </div>

        <button
          type="button"
          autoFocus
          onClick={onNext}
          className="w-full py-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-bold transition-colors"
        >
          Next Customer / New Cart [Enter]
        </button>
      </div>
    </div>
  );
}
