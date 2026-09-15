"use client";

import { FastKeyDeck } from "./FastKeyDeck";
import { OperationsPanel } from "./OperationsPanel";
import { ReceiptTape } from "./ReceiptTape";
import { useRegisterHotkeys } from "@/lib/hooks/useRegisterHotkeys";

export function RegisterScreen() {
  useRegisterHotkeys();

  return (
    <div className="flex flex-col w-full">
      <div className="grid grid-cols-12 gap-space-sm p-space-sm max-w-[1920px] mx-auto w-full h-[calc(100vh-7rem)] overflow-hidden">
        <ReceiptTape />
        <FastKeyDeck />
        <OperationsPanel />
      </div>
    </div>
  );
}
