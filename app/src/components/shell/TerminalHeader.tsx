"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { formatWeight } from "@/lib/money";
import { usePos } from "@/lib/store/pos-store";
import { useSession } from "@/lib/store/session-store";
import { LANE_NAME, TERMINAL_NAME } from "@/lib/data/session";

const BASE_NAV = [
  { href: "/register", label: "Active Register" },
  { href: "/plu", label: "Produce PLU Lookup" },
  { href: "/tender", label: "Tender & Payment" },
  { href: "/manager", label: "Manager & Shift" },
];

const MANAGER_NAV = [{ href: "/manager/products", label: "Manage Products" }];

export function TerminalHeader() {
  const pathname = usePathname();
  const { cashier, lock } = useSession();
  const { scale, hardware, member, setMember } = usePos();

  const netWeight = Math.max(0, scale.grossLb - scale.tareLb);
  const scaleLabel =
    netWeight <= 0.001 ? "Scale: 0.00 lb ZERO" : `Scale: ${formatWeight(netWeight)} lb NET`;

  const nav = cashier?.role === "manager" ? [...BASE_NAV, ...MANAGER_NAV] : BASE_NAV;

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 w-full px-space-md flex items-center justify-between gap-space-md">
        {/* Brand + lane status */}
        <div className="flex items-center gap-space-md shrink-0">
          <Link href="/register" className="flex items-center gap-space-xs" aria-label="Restohub POS home">
            <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">
              R
            </span>
            <span className="hidden 2xl:block font-label-md text-label-md text-on-surface leading-tight">
              Restohub
              <span className="block font-label-sm text-label-sm text-on-surface-variant">POS</span>
            </span>
          </Link>

          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-space-xs rounded">
            <span
              className={`w-2 h-2 rounded-full ${
                hardware.scannerReady ? "bg-primary animate-pulse" : "bg-error"
              }`}
            />
            <span className="font-label-md text-label-md text-on-surface whitespace-nowrap">
              {LANE_NAME} • {TERMINAL_NAME} • {hardware.scannerReady ? "Online" : "Offline"}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-space-xs bg-inverse-surface px-space-sm py-space-xs rounded text-inverse-on-surface">
            <Icon name="scale" className="text-primary-fixed-dim text-base" />
            <span className="font-label-md text-label-md tracking-wider text-primary-fixed whitespace-nowrap">
              {scaleLabel}
            </span>
          </div>
        </div>

        {/* Screen navigation */}
        <nav className="flex items-center gap-space-xs bg-surface-container-low p-space-xs rounded">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "px-space-md py-space-xs transition-colors bg-primary-container text-on-primary-container font-label-md text-label-md rounded"
                    : "px-space-md py-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Member, call manager, cashier chip */}
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            type="button"
            onClick={() => setMember(member ? null : null)}
            className="flex items-center gap-space-xs px-space-sm py-space-xs bg-secondary-container text-on-secondary-fixed rounded hover:bg-surface-container-high transition-colors font-label-md text-label-md"
          >
            <Icon name="badge" className="text-base" />
            <span className="hidden lg:inline">Alt+C Member</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-space-xs px-space-sm py-space-xs bg-error-container text-on-error-container rounded hover:bg-error/20 transition-colors font-label-md text-label-md"
          >
            <Icon name="notifications_active" className="text-base" />
            <span className="hidden lg:inline">F1 Call Mgr</span>
          </button>

          <div className="flex items-center gap-space-sm pl-space-xs bg-surface-container-low py-space-xs pr-space-xs rounded">
            <div className="text-right hidden sm:block">
              <div className="font-label-md text-label-md text-on-surface leading-tight">
                {cashier?.name ?? "Signed out"}
              </div>
              <div className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                {cashier ? `Shift #${cashier.shiftId}` : "—"}
              </div>
            </div>
            <Avatar name={cashier?.name ?? "POS"} />
            <button
              type="button"
              onClick={lock}
              title="Lock Terminal"
              aria-label="Lock terminal"
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icon name="lock" className="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
