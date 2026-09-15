"use client";

import { useCallback, useEffect, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { LANE_NAME } from "@/lib/data/session";
import { useSession } from "@/lib/store/session-store";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "enter"];

/**
 * Terminal lock for shift handover.
 *
 * The cashier stays signed in; any rostered cashier can take the lane by
 * entering their own PIN, which is how a real register handles a mid-shift
 * swap without a full re-auth.
 *
 * The parent mounts this only while the terminal is locked, so a half-typed PIN
 * is discarded by unmounting rather than by an effect that resets state.
 */
export function LockOverlay() {
  const { cashier, unlock, signOut } = useSession();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (value: string) => {
      if (value.length < PIN_LENGTH || busy) return;
      setBusy(true);
      const result = await unlock(value);
      setBusy(false);
      if (result.ok) {
        setPin("");
        setError(null);
      } else {
        setPin("");
        setError(result.error ?? "PIN not recognised.");
      }
    },
    [busy, unlock],
  );

  const press = useCallback(
    (key: string) => {
      setError(null);
      if (key === "clear") {
        setPin("");
        return;
      }
      if (key === "enter") {
        void submit(pin);
        return;
      }
      setPin((prev) => {
        const next = (prev + key).slice(0, PIN_LENGTH);
        if (next.length === PIN_LENGTH) void submit(next);
        return next;
      });
    },
    [pin, submit],
  );

  // Physical keypads on a register send real keystrokes, so accept them too.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (event.key === "Enter") press("enter");
      else if (event.key === "Escape") setPin("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/70 backdrop-blur-sm p-space-md">
      <div className="bg-surface-container-lowest rounded-xl shadow-modal border-2 border-surface-container-highest w-full max-w-sm p-space-lg">
        <div className="flex flex-col items-center text-center gap-space-xs">
          <Avatar name={cashier?.name ?? "POS"} className="w-16 h-16 rounded-xl" textClassName="text-headline-md font-headline-md" />
          <div className="mt-space-xs">
            <h2 className="font-headline-md text-headline-md text-on-surface">Terminal Locked</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {LANE_NAME} • {cashier ? `Held by ${cashier.name}` : "Awaiting cashier"}
            </p>
          </div>
        </div>

        {/* PIN pips */}
        <div className="flex items-center justify-center gap-space-sm my-space-lg" aria-live="polite">
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              className={`w-4 h-4 rounded-full transition-colors ${
                index < pin.length ? "bg-primary" : "bg-surface-container-highest"
              }`}
            />
          ))}
        </div>

        <div
          className={`min-h-5 text-center font-label-sm text-label-sm mb-space-sm ${
            error ? "text-error" : "text-on-surface-variant"
          }`}
        >
          {error ?? "Enter your 4-digit cashier PIN"}
        </div>

        <div className="grid grid-cols-3 gap-space-xs">
          {KEYS.map((key) => {
            if (key === "clear") {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  className="h-16 rounded-lg bg-error-container text-on-error-container font-label-md text-label-md hover:bg-error/20 transition-colors active:translate-y-0.5"
                >
                  CLR
                </button>
              );
            }
            if (key === "enter") {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  disabled={busy}
                  className="h-16 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-colors active:translate-y-0.5 disabled:opacity-60"
                  aria-label="Unlock"
                >
                  <Icon name="lock_open" className="text-xl" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                className="h-16 rounded-lg bg-surface-container-low hover:bg-surface-container font-headline-md text-headline-md text-on-surface transition-colors active:translate-y-0.5"
              >
                {key}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-space-md w-full h-12 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-space-xs transition-colors"
        >
          <Icon name="logout" className="text-base" />
          End shift &amp; sign out
        </button>
      </div>
    </div>
  );
}
