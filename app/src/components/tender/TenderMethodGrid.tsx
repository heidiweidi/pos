"use client";

import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/money";
import type { TenderKind } from "@/lib/types";

const BASE =
  "p-space-sm rounded-xl text-left transition-all relative flex flex-col justify-between group border-2";
const INACTIVE = "bg-surface-container-low hover:bg-surface-container border-transparent";
const ACTIVE = "bg-primary-container text-on-primary-container border-primary";

export function TenderMethodGrid({
  active,
  maxEbt,
  onSelect,
}: {
  active: TenderKind;
  maxEbt: number;
  onSelect: (kind: TenderKind) => void;
}) {
  const isActive = (kind: TenderKind) => kind === active;

  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-space-sm">
        <span className="font-label-lg text-label-lg text-on-surface">Select Tender Method</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Tap or use keyboard hotkeys
        </span>
      </div>

      <div className="grid grid-cols-2 gap-space-sm">
        {/* Credit / Debit */}
        <button
          type="button"
          onClick={() => onSelect("card")}
          className={`${BASE} h-24 ${isActive("card") ? ACTIVE : INACTIVE}`}
        >
          <div className="flex items-center justify-between w-full">
            <Icon
              name="credit_card"
              className={`text-2xl group-hover:scale-110 transition-transform ${
                isActive("card") ? "text-surface" : "text-primary"
              }`}
            />
            <Hotkey active={isActive("card")}>{isActive("card") ? "[F5] Active" : "[F5]"}</Hotkey>
          </div>
          <div>
            <div
              className={`font-headline-sm text-headline-sm font-semibold ${
                isActive("card") ? "text-surface" : "text-on-surface"
              }`}
            >
              Credit / Debit
            </div>
            <div
              className={`font-body-sm text-body-sm truncate ${
                isActive("card") ? "text-surface/90" : "text-on-surface-variant"
              }`}
            >
              EMV Chip, Tap, Apple/Google Pay
            </div>
          </div>
        </button>

        {/* Cash */}
        <button
          type="button"
          onClick={() => onSelect("cash")}
          className={`${BASE} h-24 ${isActive("cash") ? ACTIVE : INACTIVE}`}
        >
          <div className="flex items-center justify-between w-full">
            <Icon
              name="payments"
              className={`text-2xl group-hover:scale-110 transition-transform ${
                isActive("cash") ? "text-surface" : "text-primary"
              }`}
            />
            <Hotkey active={isActive("cash")}>{isActive("cash") ? "[F6] Active" : "[F6]"}</Hotkey>
          </div>
          <div>
            <div
              className={`font-headline-sm text-headline-sm font-bold ${
                isActive("cash") ? "text-surface" : "text-on-surface"
              }`}
            >
              Cash Currency
            </div>
            <div
              className={`font-body-sm text-body-sm truncate ${
                isActive("cash") ? "text-surface/90" : "text-on-surface-variant"
              }`}
            >
              Exact change, Quick bills, Drawer
            </div>
          </div>
        </button>

        {/* EBT / SNAP */}
        <button
          type="button"
          onClick={() => onSelect("ebt_snap")}
          className={`${BASE} h-24 ${isActive("ebt_snap") ? ACTIVE : INACTIVE}`}
        >
          <div className="flex items-center justify-between w-full">
            <Icon
              name="local_mall"
              className={`text-2xl group-hover:scale-110 transition-transform ${
                isActive("ebt_snap") ? "text-surface" : "text-tertiary"
              }`}
            />
            <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded font-bold">
              SNAP Auto
            </span>
          </div>
          <div>
            <div
              className={`font-headline-sm text-headline-sm font-semibold ${
                isActive("ebt_snap") ? "text-surface" : "text-on-surface"
              }`}
            >
              EBT / SNAP Food
            </div>
            <div
              className={`font-body-sm text-body-sm ${
                isActive("ebt_snap") ? "text-surface/90" : "text-on-surface-variant"
              }`}
            >
              Max eligible: {formatMoney(maxEbt)}
            </div>
          </div>
        </button>

        {/* EBT Cash */}
        <button
          type="button"
          onClick={() => onSelect("ebt_cash")}
          className={`${BASE} h-24 ${isActive("ebt_cash") ? ACTIVE : INACTIVE}`}
        >
          <div className="flex items-center justify-between w-full">
            <Icon
              name="account_balance_wallet"
              className={`text-2xl group-hover:scale-110 transition-transform ${
                isActive("ebt_cash") ? "text-surface" : "text-on-surface-variant"
              }`}
            />
            <Hotkey active={isActive("ebt_cash")}>[F8]</Hotkey>
          </div>
          <div>
            <div
              className={`font-headline-sm text-headline-sm font-semibold ${
                isActive("ebt_cash") ? "text-surface" : "text-on-surface"
              }`}
            >
              EBT Cash
            </div>
            <div
              className={`font-body-sm text-body-sm ${
                isActive("ebt_cash") ? "text-surface/90" : "text-on-surface-variant"
              }`}
            >
              Benefit cash withdrawal/pay
            </div>
          </div>
        </button>

        {/* Gift / points */}
        <button
          type="button"
          onClick={() => onSelect("gift")}
          className={`${BASE} h-20 ${isActive("gift") ? ACTIVE : INACTIVE}`}
        >
          <div className="flex items-center justify-between w-full">
            <Icon
              name="card_giftcard"
              className={`text-xl ${isActive("gift") ? "text-surface" : "text-primary"}`}
            />
            <span
              className={`font-label-sm text-label-sm ${
                isActive("gift") ? "text-surface/90" : "text-on-surface-variant"
              }`}
            >
              Scan / 16-Dig
            </span>
          </div>
          <div
            className={`font-label-lg text-label-lg ${
              isActive("gift") ? "text-surface" : "text-on-surface"
            }`}
          >
            Store Gift Card / Points
          </div>
        </button>

        {/* WIC */}
        <button
          type="button"
          onClick={() => onSelect("wic")}
          className={`${BASE} h-20 ${isActive("wic") ? ACTIVE : INACTIVE}`}
        >
          <div className="flex items-center justify-between w-full">
            <Icon
              name="fact_check"
              className={`text-xl ${isActive("wic") ? "text-surface" : "text-secondary"}`}
            />
            <span
              className={`font-label-sm text-label-sm ${
                isActive("wic") ? "text-surface/90" : "text-on-surface-variant"
              }`}
            >
              CVV / Paper
            </span>
          </div>
          <div
            className={`font-label-lg text-label-lg ${
              isActive("wic") ? "text-surface" : "text-on-surface"
            }`}
          >
            WIC / Store Voucher
          </div>
        </button>
      </div>
    </div>
  );
}

function Hotkey({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`font-label-sm text-label-sm px-1.5 py-0.5 rounded ${
        active ? "bg-primary/40 text-surface font-bold" : "bg-surface-container-highest text-on-surface"
      }`}
    >
      {children}
    </span>
  );
}
