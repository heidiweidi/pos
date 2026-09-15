import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline • Restohub POS" };

/** Served by the service worker when a navigation fails with no network. */
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-space-sm p-space-lg text-center bg-surface">
      <span className="material-symbols-outlined text-5xl text-tertiary">wifi_off</span>
      <h1 className="font-headline-md text-headline-md text-on-surface">Lane is offline</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
        The terminal lost its uplink. Scanning and cart totals keep working from the cached shell —
        tender and shift reports will sync once the connection returns.
      </p>
    </div>
  );
}
