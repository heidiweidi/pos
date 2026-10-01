"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { ADDONS, type AddonId } from "@/lib/addons";
import { useAddons } from "@/lib/store/addons-store";

/** Renders children only while the add-on is on; deep links get a plain notice. */
export function AddonGate({ addon, children }: { addon: AddonId; children: React.ReactNode }) {
  const { addons } = useAddons();
  if (addons[addon]) return <>{children}</>;

  const info = ADDONS.find((a) => a.id === addon);
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm py-space-xl text-center text-on-surface-variant">
      <Icon name={info?.icon ?? "extension"} className="text-4xl text-outline-variant" />
      <p className="font-label-lg text-label-lg text-on-surface">{info?.label ?? "This feature"} is turned off</p>
      <p className="font-body-sm text-body-sm">A manager can enable it under Add-ons.</p>
      <Link
        href="/register"
        className="px-space-md py-space-xs rounded bg-primary-container text-on-primary-container font-label-md text-label-md"
      >
        Back to register
      </Link>
    </div>
  );
}
