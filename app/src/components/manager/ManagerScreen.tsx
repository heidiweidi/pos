"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DrawerCount } from "./DrawerCount";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { DEMO_SHIFT, DENOMINATIONS } from "@/lib/data/session";
import { formatMoney } from "@/lib/money";
import { usePos } from "@/lib/store/pos-store";
import { useSession } from "@/lib/store/session-store";

const OVERRIDE_ICON: Record<string, { name: string; className: string }> = {
  price_override: { name: "price_change", className: "text-tertiary-container" },
  post_tender_void: { name: "delete_forever", className: "text-error" },
  line_void: { name: "remove_shopping_cart", className: "text-error" },
  no_sale: { name: "point_of_sale", className: "text-secondary" },
};

export function ManagerScreen() {
  const router = useRouter();
  const { cashier, lock } = useSession();
  const { hardware, showToast, setHardware } = usePos();
  const shift = DEMO_SHIFT;

  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(DENOMINATIONS.map((d) => [d.id, d.defaultCount])),
  );

  const dropTotal = shift.safeDrops.reduce((sum, d) => sum + d.amount, 0);
  const expected = shift.openingFloatCents + shift.cashSalesCents - dropTotal;

  const counted = useMemo(
    () =>
      DENOMINATIONS.reduce((sum, denom) => {
        const entered = counts[denom.id] ?? 0;
        // The coin row is entered as a dollar amount, not a piece count.
        return sum + (denom.valueCents === null ? entered : entered * denom.valueCents);
      }, 0),
    [counts],
  );

  const variance = counted - expected;
  const balanced = variance === 0;

  return (
    <div className="p-space-md flex flex-col gap-space-md max-w-[1920px] mx-auto w-full">
      {/* Cashier + KPI strip */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <div className="relative shrink-0">
              <Avatar
                name={cashier?.name ?? shift.cashierName}
                className="w-12 h-12 rounded-xl"
                textClassName="text-headline-sm font-headline-sm"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <Icon name="verified" className="text-[11px]" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  {cashier?.name ?? shift.cashierName}
                </span>
                <span className="bg-surface-container px-space-xs py-0.5 rounded font-label-sm text-label-sm text-on-surface-variant">
                  Badge #{cashier?.badge ?? shift.badge}
                </span>
                <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-space-xs py-0.5 rounded">
                  Active {shift.lane}
                </span>
              </div>
              <div className="flex items-center gap-space-sm mt-1 font-body-sm text-body-sm text-on-surface-variant flex-wrap">
                <span className="flex items-center gap-1">
                  <Icon name="schedule" className="text-sm" /> {shift.startedAt} – {shift.endsAt}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary font-semibold">
                  <Icon name="swap_horiz" className="text-sm" /> Mid-Shift Audit
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm flex-1 max-w-3xl">
            <Kpi
              label="Gross Sales"
              value={formatMoney(shift.grossSalesCents)}
              caption={`${shift.transactionCount} Transactions`}
              valueClass="text-primary"
            />
            <Kpi
              label="Average Basket"
              value={formatMoney(shift.averageBasketCents)}
              caption="+8.4% target"
              captionClass="text-primary"
              captionIcon="trending_up"
            />
            <Kpi
              label="Scan Velocity"
              value={`${shift.scanVelocity}`}
              valueSuffix="it/min"
              caption="Tier 1 Speed"
              captionClass="text-primary font-semibold"
            />
            <Kpi
              label="Cash Variance"
              value={formatMoney(variance)}
              caption={balanced ? "In Perfect Balance" : variance > 0 ? "Drawer Over" : "Drawer Short"}
              valueClass={balanced ? "text-primary" : "text-error"}
              captionClass={balanced ? "text-primary font-semibold" : "text-error font-semibold"}
            />
          </div>
        </div>
      </div>

      {/* Split cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* LEFT: reconciliation + safe drops */}
        <div className="lg:col-span-7 flex flex-col space-y-space-md">
          <DrawerCount
            denominations={DENOMINATIONS}
            counts={counts}
            onChange={(id, value) => setCounts((prev) => ({ ...prev, [id]: value }))}
            onRecount={() =>
              setCounts(Object.fromEntries(DENOMINATIONS.map((d) => [d.id, 0])))
            }
            openingFloat={shift.openingFloatCents}
            cashSales={shift.cashSalesCents}
            dropTotal={dropTotal}
            dropCount={shift.safeDrops.length}
            expected={expected}
            counted={counted}
            variance={variance}
          />

          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <Icon name="shield_lock" className="text-outline text-lg" />
                <span className="font-label-lg text-label-lg text-on-surface">
                  Shift Safe Drops Executed
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {shift.safeDrops.length} drops to Store Vault
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              {shift.safeDrops.map((drop) => (
                <div
                  key={drop.id}
                  className="p-space-sm bg-surface-container-low rounded-lg flex items-center justify-between gap-space-sm"
                >
                  <div className="min-w-0">
                    <div className="font-label-md text-label-md text-on-surface truncate">
                      Drop #{String(drop.sequence).padStart(2, "0")} • Envelope #{drop.envelope}
                    </div>
                    <div className="font-body-sm text-body-sm text-outline">
                      {drop.at} • Verified by {drop.verifiedBy}
                    </div>
                  </div>
                  <span className="font-numeric-md text-numeric-md text-error font-bold shrink-0">
                    -{formatMoney(drop.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: reports, overrides, diagnostics, actions */}
        <div className="lg:col-span-5 flex flex-col space-y-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
            <div className="flex items-center gap-space-xs mb-space-sm">
              <Icon name="receipt_long" className="text-primary text-xl" />
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                Shift &amp; Register Reports
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-xs">
              <ReportKey
                icon="print"
                iconClass="text-primary"
                label="X-Report"
                caption="Mid-Shift Read"
                onClick={() =>
                  showToast({ title: "X-Report queued", detail: "Mid-shift read printing", tone: "success" })
                }
              />
              <ReportKey
                icon="receipt"
                iconClass="text-tertiary-container"
                label="Z-Report"
                caption="End-Day Reset"
                onClick={() =>
                  showToast({ title: "Z-Report requires shift close", tone: "warning" })
                }
              />
              <ReportKey
                icon="file_download"
                iconClass="text-secondary"
                label="Export CSV"
                caption="Store Office Sync"
                onClick={() =>
                  showToast({ title: "CSV export started", detail: "Syncing to store office", tone: "success" })
                }
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <Icon name="fact_check" className="text-primary text-lg" />
                <span className="font-label-lg text-label-lg text-on-surface">
                  Supervisor Overrides Log
                </span>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container px-space-xs py-0.5 rounded text-on-surface-variant">
                Today ({shift.lane})
              </span>
            </div>
            <div className="space-y-space-xs">
              {shift.overrides.map((entry) => {
                const icon = OVERRIDE_ICON[entry.kind] ?? OVERRIDE_ICON.line_void;
                return (
                  <div
                    key={entry.id}
                    className="p-space-sm rounded-lg bg-surface-container-low flex items-start justify-between gap-space-sm"
                  >
                    <div className="flex items-start gap-space-sm min-w-0">
                      <Icon name={icon.name} className={`text-lg mt-0.5 ${icon.className}`} />
                      <div className="min-w-0">
                        <div className="font-label-md text-label-md text-on-surface">
                          {entry.title}
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          {entry.detail}
                        </div>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline whitespace-nowrap">
                      {entry.at}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <Icon name="tune" className="text-primary text-lg" />
                <span className="font-label-lg text-label-lg text-on-surface">
                  Hardware Diagnostics
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-semibold">All Pass</span>
            </div>
            <div className="grid grid-cols-2 gap-space-xs font-body-sm text-body-sm">
              <Diag label="Scale Zero Calib:" value="0.00 lb" ok={hardware.scaleCalibrated} icon="check" />
              <Diag label="Xenon Scanner:" value="Laser OK" ok={hardware.scannerReady} icon="check" />
              <Diag
                label="Epson TM-T88:"
                value={`${hardware.printerPaperPercent}% Roll`}
                ok={hardware.printerPaperPercent > 15}
                neutral
              />
              <Diag label="EFT Terminal:" value="Encrypted" ok={hardware.pinPadReady} icon="lock" />
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm">
            <span className="font-label-lg text-label-lg text-on-surface block">
              Lane &amp; Shift Execution
            </span>

            <button
              type="button"
              onClick={() => {
                setHardware({ drawerOpen: true });
                showToast({
                  title: "Safe drop staged",
                  detail: "Tamper seal voucher #4119 generated",
                  tone: "warning",
                });
              }}
              className="w-full h-14 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl flex items-center justify-between px-space-md shadow-sm transition-all active:translate-y-0.5 gap-space-sm"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <Icon name="payments" className="text-primary text-xl" />
                <div className="text-left min-w-0">
                  <span className="font-label-md text-label-md block truncate">
                    Execute Safe Cash Drop ($500.00)
                  </span>
                  <span className="block font-body-sm text-body-sm text-outline truncate">
                    Generate tamper seal voucher #4119
                  </span>
                </div>
              </div>
              <Icon name="chevron_right" className="text-outline" />
            </button>

            <button
              type="button"
              onClick={lock}
              className="w-full h-14 bg-secondary-container hover:bg-surface-container-high text-on-secondary-fixed rounded-xl flex items-center justify-between px-space-md shadow-sm transition-all active:translate-y-0.5 gap-space-sm"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <Icon name="switch_account" className="text-xl" />
                <div className="text-left min-w-0">
                  <span className="font-label-md text-label-md block truncate">
                    Lock Lane &amp; Cashier Handover
                  </span>
                  <span className="block font-body-sm text-body-sm text-on-secondary-fixed-variant truncate">
                    Allow next cashier to sign in
                  </span>
                </div>
              </div>
              <Icon name="lock" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!balanced) {
                  showToast({
                    title: "Drawer not balanced",
                    detail: `${formatMoney(Math.abs(variance))} ${variance > 0 ? "over" : "short"} — recount before close`,
                    tone: "error",
                  });
                  return;
                }
                showToast({
                  title: "Z-Report finalised",
                  detail: "Drawer locked and shift closed",
                  tone: "success",
                });
                router.push("/register");
              }}
              className="w-full h-16 bg-primary hover:bg-primary-container text-on-primary rounded-xl flex items-center justify-between px-space-md shadow-md transition-all active:translate-y-0.5 gap-space-sm"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <Icon name="verified_user" className="text-2xl" />
                <div className="text-left min-w-0">
                  <span className="font-label-lg text-label-lg leading-tight block truncate">
                    Finalize Z-Report &amp; Close Shift
                  </span>
                  <span className="font-body-sm text-body-sm text-primary-fixed-dim block truncate">
                    Complete reconciliation &amp; lock drawer
                  </span>
                </div>
              </div>
              <Icon name="arrow_forward" className="text-2xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  valueSuffix,
  caption,
  valueClass = "text-on-surface",
  captionClass = "text-outline",
  captionIcon,
}: {
  label: string;
  value: string;
  valueSuffix?: string;
  caption: string;
  valueClass?: string;
  captionClass?: string;
  captionIcon?: string;
}) {
  return (
    <div className="bg-surface-container-low p-space-sm rounded-lg">
      <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        {label}
      </div>
      <div className={`font-numeric-lg text-numeric-lg mt-0.5 ${valueClass}`}>
        {value}
        {valueSuffix ? (
          <span className="font-body-sm text-body-sm text-outline"> {valueSuffix}</span>
        ) : null}
      </div>
      <div className={`font-label-sm text-label-sm flex items-center gap-0.5 ${captionClass}`}>
        {captionIcon ? <Icon name={captionIcon} className="text-xs" /> : null}
        {caption}
      </div>
    </div>
  );
}

function ReportKey({
  icon,
  iconClass,
  label,
  caption,
  onClick,
}: {
  icon: string;
  iconClass: string;
  label: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-all active:translate-y-0.5 text-center"
    >
      <Icon name={icon} className={`text-2xl mb-1 ${iconClass}`} />
      <span className="font-label-md text-label-md">{label}</span>
      <span className="font-body-sm text-body-sm text-outline">{caption}</span>
    </button>
  );
}

function Diag({
  label,
  value,
  ok,
  icon,
  neutral,
}: {
  label: string;
  value: string;
  ok: boolean;
  icon?: string;
  neutral?: boolean;
}) {
  return (
    <div className="p-space-xs bg-surface-container-low rounded flex items-center justify-between gap-space-xs">
      <span className="text-on-surface-variant truncate">{label}</span>
      <span
        className={`font-semibold flex items-center gap-0.5 shrink-0 ${
          neutral ? "text-on-surface" : ok ? "text-primary" : "text-error"
        }`}
      >
        {icon && !neutral ? <Icon name={ok ? icon : "error"} className="text-xs" /> : null}
        {value}
      </span>
    </div>
  );
}
