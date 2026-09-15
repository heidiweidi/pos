"use client";

import { Icon } from "@/components/ui/Icon";
import { usePos } from "@/lib/store/pos-store";

const TONE_ICON = {
  success: "check_circle",
  warning: "info",
  error: "error",
} as const;

const TONE_COLOR = {
  success: "text-primary-fixed",
  warning: "text-tertiary-fixed-dim",
  error: "text-error-container",
} as const;

/** Bottom-right confirmation toast, matching the design's micro-interaction. */
export function Toast() {
  const { toast } = usePos();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-16 right-space-md z-[90] bg-inverse-surface text-inverse-on-surface px-space-md py-space-sm rounded-lg shadow-modal flex items-center gap-space-sm transition-all duration-300 ${
        toast ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-4"
      }`}
    >
      <Icon
        name={toast ? TONE_ICON[toast.tone] : "check_circle"}
        className={`text-xl ${toast ? TONE_COLOR[toast.tone] : ""}`}
      />
      <div>
        <div className="font-label-md text-label-md">{toast?.title ?? ""}</div>
        {toast?.detail ? (
          <div className="font-body-sm text-body-sm text-inverse-on-surface/80">{toast.detail}</div>
        ) : null}
      </div>
    </div>
  );
}
