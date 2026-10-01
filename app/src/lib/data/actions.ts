"use server";

import type { LoyaltyMember, ShiftSummary } from "../types";
import { getDataAdapter } from "./index";

/**
 * Server actions for screens that need adapter data after mount. They run on
 * the server so they use whichever adapter the terminal's mode selects (and, in
 * actual mode, the signed-in cashier's Supabase session cookie).
 */

export async function getShiftSummaryAction(shiftId: string): Promise<ShiftSummary | null> {
  try {
    return await (await getDataAdapter()).getShiftSummary(shiftId);
  } catch (error) {
    console.error("[actions] getShiftSummary failed:", error);
    return null;
  }
}

export async function findMemberAction(query: string): Promise<LoyaltyMember | null> {
  try {
    return await (await getDataAdapter()).findMember(query);
  } catch (error) {
    console.error("[actions] findMember failed:", error);
    return null;
  }
}
