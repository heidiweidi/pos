"use client";

import { Icon } from "@/components/ui/Icon";
import { usePos } from "@/lib/store/pos-store";

const HOTKEYS = [
  { key: "[F2]", label: "Void" },
  { key: "[F3]", label: "Qty" },
  { key: "[F4]", label: "Price Check" },
  { key: "[F7]", label: "Hold Cart" },
];

export function StatusFooter() {
  const { hardware } = usePos();

  return (
    <footer className="fixed bottom-0 w-full z-40 bg-surface-container-lowest shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-12 w-full px-space-md flex items-center justify-between gap-space-md text-on-surface-variant">
        <div className="flex items-center gap-space-md font-label-sm text-label-sm overflow-hidden text-ellipsis whitespace-nowrap">
          <div className="flex items-center gap-space-xs">
            <Icon name="wifi" className="text-sm text-primary" />
            <span>Edge: {hardware.edgeLatencyMs}ms</span>
          </div>
          <div className="hidden md:flex items-center gap-space-xs">
            <Icon
              name="barcode_scanner"
              className={`text-sm ${hardware.scannerReady ? "text-primary" : "text-error"}`}
            />
            <span>Honeywell Xenon {hardware.scannerReady ? "Ready" : "Disconnected"}</span>
          </div>
          <div className="hidden lg:flex items-center gap-space-xs">
            <Icon
              name="scale"
              className={`text-sm ${hardware.scaleCalibrated ? "text-primary" : "text-tertiary"}`}
            />
            <span>Toledo Avery Berkel {hardware.scaleCalibrated ? "Calibrated" : "In Motion"}</span>
          </div>
          <div className="hidden sm:flex items-center gap-space-xs">
            <Icon name="print" className="text-sm text-primary" />
            <span>Epson TM-T88VI ({hardware.printerPaperPercent}% Roll)</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <Icon
              name="meeting_room"
              className={`text-sm ${hardware.drawerOpen ? "text-error" : "text-outline"}`}
            />
            <span>Drawer: {hardware.drawerOpen ? "OPEN" : "Closed"}</span>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-space-sm font-label-sm text-label-sm text-on-surface">
          {HOTKEYS.map((h) => (
            <span
              key={h.key}
              className="bg-surface-container px-space-xs py-0.5 rounded text-on-surface-variant"
            >
              {h.key} {h.label}
            </span>
          ))}
          <span className="bg-primary-container px-space-xs py-0.5 rounded text-on-primary-container font-semibold">
            [F12] Pay
          </span>
        </div>
      </div>
    </footer>
  );
}
