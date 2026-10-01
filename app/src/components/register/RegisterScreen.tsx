"use client";

import { FastKeyDeck } from "./FastKeyDeck";
import { PayPanel, ToolsPanel } from "./OperationsPanel";
import { ReceiptTape } from "./ReceiptTape";
import { useRegisterHotkeys } from "@/lib/hooks/useRegisterHotkeys";

/**
 * Two columns: items to sell on the left (scan dock, tiles, function keys),
 * and the sale on the right — the receipt tape with the Pay button right
 * beneath it, so the cashier's eyes stay on one side to finish a sale.
 */
export function RegisterScreen() {
  useRegisterHotkeys();

  return (
    <div className="flex flex-col w-full">
      <div className="grid grid-cols-12 gap-space-sm p-space-sm max-w-[1920px] mx-auto w-full h-[calc(100vh-7rem)] overflow-hidden">
        <div className="col-span-12 lg:col-span-7 flex flex-col h-full gap-space-sm overflow-hidden">
          <FastKeyDeck />
          <ToolsPanel />
        </div>
        <div className="col-span-12 lg:col-span-5 flex flex-col h-full gap-space-sm overflow-hidden">
          <ReceiptTape />
          <PayPanel />
        </div>
      </div>
    </div>
  );
}
