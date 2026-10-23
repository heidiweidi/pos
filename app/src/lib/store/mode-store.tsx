"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PosMode } from "../mode";

/** Server-resolved mode, so the first client render matches the server's. */
const ModeContext = createContext<PosMode>("demo");

export function ModeProvider({ mode, children }: { mode: PosMode; children: ReactNode }) {
  return <ModeContext.Provider value={mode}>{children}</ModeContext.Provider>;
}

export function useMode(): PosMode {
  return useContext(ModeContext);
}
