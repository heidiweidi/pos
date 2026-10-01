"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DiscountDialog } from "./DiscountDialog";

import { Icon } from "@/components/ui/Icon";
import { findMemberAction } from "@/lib/data/actions";
import { DEMO_MEMBER } from "@/lib/data/session";
import { formatMoney, formatWeight } from "@/lib/money";
import { useAddons } from "@/lib/store/addons-store";
import { useMode } from "@/lib/store/mode-store";
import { useRegion } from "@/lib/store/region-store";
import { usePos } from "@/lib/store/pos-store";

/**
 * Sits under the receipt tape: quick cash shortcuts and the big TENDER / PAY
 * button, so the total and the way to settle it are always together.
 */
export function PayPanel() {
  const router = useRouter();
  const { addons } = useAddons();
  const { currency } = useRegion();
  const { totals, showToast } = usePos();

  const goToTender = () => {
    if (totals.total <= 0) {
      showToast({ title: "Nothing to tender", detail: "Cart is empty", tone: "warning" });
      return;
    }
    router.push("/tender");
  };

  return (
    <div className="flex flex-col gap-space-xs shrink-0">
      {/* Fast tender shortcuts */}
      <div className="grid grid-cols-2 gap-space-xs shrink-0">
        <button
          type="button"
          onClick={() => router.push(`/tender?cash=${currency.fastCashCents}`)}
          className="h-12 bg-surface-container-lowest hover:bg-surface-container-high transition-colors rounded-lg flex items-center justify-center gap-1 font-label-md text-label-md text-on-surface shadow-tile active:translate-y-0.5"
        >
          <Icon name="payments" className="text-primary text-base" />
          <span>Fast {formatMoney(currency.fastCashCents).replace(/\.00$/, "")}</span>
        </button>
        <button
          type="button"
          onClick={() => router.push(`/tender?cash=${totals.total}`)}
          className="h-12 bg-surface-container-lowest hover:bg-surface-container-high transition-colors rounded-lg flex items-center justify-center gap-1 font-label-md text-label-md text-on-surface shadow-tile active:translate-y-0.5"
        >
          <Icon name="paid" className="text-primary text-base" />
          <span className="truncate">Exact {formatMoney(totals.total)}</span>
        </button>
      </div>

      {/* Primary tender CTA */}
      <button
        type="button"
        onClick={goToTender}
        className="h-16 bg-primary-container text-on-primary-container hover:bg-primary transition-all rounded-xl p-space-sm flex items-center justify-between shadow-lg active:translate-y-0.5 shrink-0 group"
      >
        <div className="text-left">
          <div className="font-headline-sm text-headline-sm leading-tight flex items-center gap-1.5">
            <span>TENDER / PAY</span>
            <Icon name="arrow_forward" className="text-xl group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="font-label-sm text-label-sm opacity-90">[F12] {addons.ebt ? "Card • Cash • SNAP" : "Card • Cash"}</div>
        </div>
        <div className="font-numeric-lg text-numeric-lg font-bold">{formatMoney(totals.total)}</div>
      </button>
    </div>
  );
}

/** Left column, under the item tiles: scale readout (Scale add-on) and the cashier function keys. */
export function ToolsPanel() {
  const { addons } = useAddons();
  const mode = useMode();
  const [discountOpen, setDiscountOpen] = useState(false);
  const {
    scale,
    setScale,
    holdCart,
    recallCart,
    heldCarts,
    selectedLineId,
    voidLine,
    changeQty,
    setHardware,
    hardware,
    member,
    setMember,
    discount,
    showToast,
  } = usePos();
  const { currency } = useRegion();

  const netWeight = Math.max(0, scale.grossLb - scale.tareLb);

  const requireSelection = (action: (id: string) => void) => {
    if (!selectedLineId) {
      showToast({ title: "Select a cart line first", tone: "warning" });
      return;
    }
    action(selectedLineId);
  };

  return (
    <div className="flex flex-col gap-space-sm shrink-0">
      {/* Scale HUD (Scale add-on) */}
      {addons.scale ? (
        <div className="bg-inverse-surface rounded-xl p-space-md text-inverse-on-surface shadow-md shrink-0 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon name="scale" className="text-primary-fixed-dim text-lg" />
              <span className="font-label-md text-label-md text-primary-fixed tracking-wider">
                Avery Berkel 6712
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  scale.stable
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-tertiary-container text-on-tertiary-container"
                }`}
              >
                {scale.stable ? "STABLE" : "MOTION"}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container-lowest/20 text-inverse-on-surface">
                NET
              </span>
            </div>
          </div>

          <div className="my-space-xs flex items-baseline justify-between">
            <span className="font-numeric-hero text-numeric-hero text-primary-fixed font-bold tracking-tight">
              {formatWeight(netWeight)}
            </span>
            <div className="text-right">
              <span className="font-label-lg text-label-lg text-primary-fixed font-bold">LB</span>
              <div className="font-body-sm text-body-sm text-surface-dim">
                Tare: {formatWeight(scale.tareLb)} lb
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1">
            <ScaleKey label="ZERO" onClick={() => setScale({ grossLb: 0, tareLb: 0, stable: true })} />
            <ScaleKey label="TARE" onClick={() => setScale({ tareLb: scale.grossLb })} />
            <ScaleKey
              label="MANUAL"
              onClick={() => {
                const input = window.prompt("Enter gross weight in lb:", formatWeight(scale.grossLb));
                if (input === null) return;
                const lb = Number.parseFloat(input);
                if (Number.isFinite(lb) && lb >= 0) setScale({ grossLb: lb, stable: true });
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Cashier function matrix */}
      <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-md grid grid-cols-4 gap-space-xs shrink-0">
        {addons.holds ? (
          <>
            <FnKey
              icon="pause_circle"
              iconClass="text-primary"
              label="Hold Cart"
              hint="[F7]"
              onClick={() => {
                holdCart();
                showToast({ title: "Cart suspended", detail: "Ticket held for recall", tone: "success" });
              }}
            />
            <FnKey
              icon="play_circle"
              iconClass="text-primary"
              label="Recall Cart"
              hint={heldCarts.length > 0 ? `${heldCarts.length} held` : "Hold List"}
              onClick={() => {
                if (heldCarts.length === 0) {
                  showToast({ title: "No held carts", tone: "warning" });
                  return;
                }
                recallCart(heldCarts[0].id);
                showToast({ title: "Cart recalled", detail: heldCarts[0].label, tone: "success" });
              }}
            />
          </>
        ) : null}
        <FnKey
          icon="remove_shopping_cart"
          iconClass="text-error"
          labelClass="text-error"
          label="Line Void"
          hint="[F2]"
          onClick={() => requireSelection(voidLine)}
        />
        <FnKey
          icon="calculate"
          iconClass="text-primary"
          label="Quantity"
          hint="[F3] Multiplier"
          onClick={() =>
            requireSelection((id) => {
              changeQty(id, 1);
              showToast({ title: "Quantity increased", tone: "success" });
            })
          }
        />
        {addons.overrides ? (
          <>
            <FnKey
              icon="supervisor_account"
              iconClass="text-tertiary"
              label="Override"
              hint="Supervisor"
              onClick={() => showToast({ title: "Select a line, then tap Override", tone: "warning" })}
            />
            <FnKey
              icon="point_of_sale"
              iconClass="text-secondary"
              label="Open Drawer"
              hint="No Sale"
              onClick={() => {
                setHardware({ drawerOpen: !hardware.drawerOpen });
                showToast({
                  title: hardware.drawerOpen ? "Drawer closed" : "Drawer kicked",
                  detail: "No-sale logged to the override journal",
                  tone: "warning",
                });
              }}
            />
          </>
        ) : null}
        {currency.discounts.length > 0 ? (
          <FnKey
            icon="percent"
            iconClass="text-tertiary"
            label={discount ? "Discount On" : "Discount"}
            hint="Senior / PWD"
            onClick={() => setDiscountOpen(true)}
          />
        ) : null}
        <FnKey
          icon="print"
          iconClass="text-on-surface"
          label="Reprint Slip"
          hint="Last Order"
          onClick={() => showToast({ title: "Reprinting last slip", tone: "success" })}
        />
        {addons.loyalty ? (
          <FnKey
            icon="person_add"
            iconClass="text-primary"
            label="Lookup Loyalty"
            hint="Phone / Alt+C"
            onClick={async () => {
              if (member) {
                setMember(null);
                showToast({ title: "Member detached", tone: "success" });
                return;
              }
              // Demo mode attaches the sample member; actual mode looks the
              // customer up in the store's own member list.
              if (mode === "demo") {
                setMember(DEMO_MEMBER);
                showToast({ title: `Attached ${DEMO_MEMBER.name}`, tone: "success" });
                return;
              }
              const query = window.prompt("Member phone number or account #:");
              if (!query?.trim()) return;
              const found = await findMemberAction(query);
              if (!found) {
                showToast({ title: "Member not found", detail: `No match for "${query.trim()}"`, tone: "error" });
                return;
              }
              setMember(found);
              showToast({ title: `Attached ${found.name}`, tone: "success" });
            }}
          />
        ) : null}
      </div>
      {discountOpen ? <DiscountDialog onClose={() => setDiscountOpen(false)} /> : null}
    </div>
  );
}

function ScaleKey({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="py-1.5 bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 transition-colors rounded text-center font-label-sm text-label-sm text-inverse-on-surface active:scale-95"
    >
      {label}
    </button>
  );
}

function FnKey({
  icon,
  iconClass,
  label,
  labelClass = "",
  hint,
  onClick,
}: {
  icon: string;
  iconClass: string;
  label: string;
  labelClass?: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors text-on-surface text-center active:scale-95 min-h-[72px]"
    >
      <Icon name={icon} className={`text-xl mb-0.5 ${iconClass}`} />
      <span className={`font-label-sm text-label-sm font-semibold ${labelClass}`}>{label}</span>
      <span className="text-[10px] text-on-surface-variant">{hint}</span>
    </button>
  );
}
