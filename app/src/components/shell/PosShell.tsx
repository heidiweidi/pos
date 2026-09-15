"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LockOverlay } from "./LockOverlay";
import { StatusFooter } from "./StatusFooter";
import { TerminalHeader } from "./TerminalHeader";
import { Toast } from "./Toast";
import { Icon } from "@/components/ui/Icon";
import { useSession } from "@/lib/store/session-store";

export function PosShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { cashier, loading, locked } = useSession();

  // Bounce to the sign-in screen once session restore has actually finished —
  // redirecting earlier would kick a cashier out on every page reload.
  useEffect(() => {
    if (!loading && !cashier) router.replace("/login");
  }, [cashier, loading, router]);

  if (loading || !cashier) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-space-sm text-on-surface-variant">
        <Icon name="point_of_sale" className="text-4xl text-primary" />
        <span className="font-label-md text-label-md">Starting terminal…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TerminalHeader />
      <main className="w-full pt-16 pb-12 bg-surface flex-1">{children}</main>
      <StatusFooter />
      <Toast />
      {locked ? <LockOverlay /> : null}
    </div>
  );
}
