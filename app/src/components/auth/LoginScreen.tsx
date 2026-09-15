"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { DEMO_PASSWORD } from "@/lib/auth";
import { CASHIERS, LANE_NAME, TERMINAL_NAME } from "@/lib/data/session";
import { useSession } from "@/lib/store/session-store";

/**
 * Terminal sign-in.
 *
 * This screen isn't in the supplied designs — it's built from the same tokens:
 * the inverse-surface lane panel from the scale HUD on the left, an emerald
 * primary action, and touch targets at the 48–56px the spec calls for.
 */
export function LoginScreen() {
  const router = useRouter();
  const { signIn, cashier, loading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (e.g. a reload landed here) — go straight to the lane.
  useEffect(() => {
    if (!loading && cashier) router.replace("/register");
  }, [cashier, loading, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.ok) router.replace("/register");
    else setError(result.error ?? "Sign-in failed.");
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Lane identity panel */}
      <aside className="hidden lg:flex flex-col justify-between bg-inverse-surface text-inverse-on-surface p-space-xl">
        <div className="flex items-center gap-space-sm">
          <span className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-headline-md text-headline-md">
            R
          </span>
          <div>
            <div className="font-headline-sm text-headline-sm text-surface-bright">Restohub POS</div>
            <div className="font-label-sm text-label-sm text-primary-fixed-dim">
              Restohub Trading Co.
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-headline-xl text-headline-xl text-surface-bright tracking-tight">
            {LANE_NAME}
          </h1>
          <p className="font-body-lg text-body-lg text-inverse-on-surface/80 mt-space-sm">
            {TERMINAL_NAME} is armed and waiting for a cashier. Sign in once at the start of your
            shift — after that the lane unlocks with your PIN.
          </p>

          <div className="mt-space-xl grid grid-cols-2 gap-space-sm">
            <StatusTile icon="barcode_scanner" label="Scanner" value="Xenon Ready" />
            <StatusTile icon="scale" label="Scale" value="Calibrated" />
            <StatusTile icon="print" label="Printer" value="Paper OK" />
            <StatusTile icon="wifi" label="Edge" value="12 ms" />
          </div>
        </div>

        <p className="font-label-sm text-label-sm text-inverse-on-surface/60">
          Unattended terminals lock automatically. Report a hardware fault to your supervisor before
          opening the lane.
        </p>
      </aside>

      {/* Sign-in form */}
      <main className="flex items-center justify-center p-space-lg bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-space-sm mb-space-lg">
            <span className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-headline-md text-headline-md">
              R
            </span>
            <div>
              <div className="font-headline-sm text-headline-sm text-on-surface">Restohub POS</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                {LANE_NAME} • {TERMINAL_NAME}
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg">
            <h2 className="font-headline-md text-headline-md text-on-surface">Cashier sign-in</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Use your Restohub terminal account to open the lane.
            </p>

            <form onSubmit={submit} className="mt-space-lg flex flex-col gap-space-md">
              <div>
                <label
                  htmlFor="email"
                  className="font-label-md text-label-md text-on-surface block mb-space-xs"
                >
                  Work email
                </label>
                <div className="relative">
                  <Icon
                    name="mail"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@restohub.test"
                    className="w-full h-12 pl-11 pr-3 bg-surface-container-low rounded-lg font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="font-label-md text-label-md text-on-surface block mb-space-xs"
                >
                  Password
                </label>
                <div className="relative">
                  <Icon
                    name="key"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-12 bg-surface-container-low rounded-lg font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-lg" />
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-space-xs bg-error-container text-on-error-container px-space-sm py-space-xs rounded-lg font-label-md text-label-md"
                >
                  <Icon name="error" className="text-base mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="h-14 w-full rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-md transition-all active:translate-y-0.5 disabled:opacity-60"
              >
                <Icon name={busy ? "progress_activity" : "login"} className={busy ? "animate-spin" : ""} />
                {busy ? "Opening lane…" : `Open ${LANE_NAME}`}
              </button>
            </form>
          </div>

          {/* Demo roster — remove once Supabase Auth is wired in phase 2. */}
          <div className="mt-space-md bg-surface-container-low rounded-xl p-space-md">
            <div className="flex items-center gap-space-xs mb-space-sm">
              <Icon name="science" className="text-tertiary text-base" />
              <span className="font-label-md text-label-md text-on-surface">
                Demo accounts (password: {DEMO_PASSWORD})
              </span>
            </div>
            <div className="flex flex-col gap-space-xs">
              {CASHIERS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => fillDemo(c.email)}
                  className="flex items-center gap-space-sm p-space-xs rounded-lg bg-surface-container-lowest hover:bg-surface-container transition-colors text-left"
                >
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="font-label-md text-label-md text-on-surface truncate">
                      {c.name}{" "}
                      <span className="text-on-surface-variant font-normal">
                        • {c.role} • PIN {c.pin}
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {c.email}
                    </div>
                  </div>
                  <Icon name="arrow_forward" className="text-base text-outline" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-surface-container-lowest/10 rounded-lg p-space-sm">
      <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-inverse-on-surface/70">
        <Icon name={icon} className="text-sm text-primary-fixed-dim" />
        {label}
      </div>
      <div className="font-label-lg text-label-lg text-primary-fixed mt-0.5">{value}</div>
    </div>
  );
}
