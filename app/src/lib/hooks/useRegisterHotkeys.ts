"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAddons } from "@/lib/store/addons-store";
import { usePos } from "@/lib/store/pos-store";

/**
 * Physical POS function keys.
 *
 * Cashiers work these by muscle memory, so the browser defaults are suppressed
 * — F12 opening devtools mid-transaction would be a genuine incident.
 */
export function useRegisterHotkeys() {
  const router = useRouter();
  const { addons } = useAddons();
  const { selectedLineId, voidLine, changeQty, holdCart, totals, showToast } = usePos();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case "F2":
          event.preventDefault();
          if (selectedLineId) {
            voidLine(selectedLineId);
            showToast({ title: "Line voided", tone: "error" });
          } else {
            showToast({ title: "Select a cart line first", tone: "warning" });
          }
          break;
        case "F3":
          event.preventDefault();
          if (selectedLineId) changeQty(selectedLineId, 1);
          else showToast({ title: "Select a cart line first", tone: "warning" });
          break;
        case "F4":
          event.preventDefault();
          if (!addons.scale) break;
          router.push("/plu");
          break;
        case "F7":
          event.preventDefault();
          if (!addons.holds) break;
          holdCart();
          showToast({ title: "Cart suspended", detail: "Ticket held for recall", tone: "success" });
          break;
        case "F12":
          event.preventDefault();
          if (totals.total > 0) router.push("/tender");
          else showToast({ title: "Nothing to tender", tone: "warning" });
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addons.scale, addons.holds, router, selectedLineId, voidLine, changeQty, holdCart, totals.total, showToast]);
}
