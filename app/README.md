# Restohub POS

Touch checkout terminal for Restohub Trading Co. — a Next.js 16 App Router PWA
that deploys to Cloudflare Workers and is wired for Supabase.

Converted from the Stitch design exports in `../design/`, with the tokens in
`../design/DESIGN.md` ported verbatim into `tailwind.config.ts`.

**Phase 1 (this build): fully working on dummy data.** Every screen is
interactive — scanning, cart maths, weighing, tender and change, drawer
reconciliation. Phase 2 swaps the data and auth layers for Supabase without
touching a single screen.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign in with any demo account (they're listed on the login screen):

| Cashier       | Email                          | Password   | PIN  | Role       |
| ------------- | ------------------------------ | ---------- | ---- | ---------- |
| Sarah Jenkins | `sarah.jenkins@restohub.test`  | `restohub` | 4821 | manager    |
| Mike Torres   | `mike.torres@restohub.test`    | `restohub` | 8021 | supervisor |
| Ana Reyes     | `ana.reyes@restohub.test`      | `restohub` | 1357 | cashier    |

The lock button in the header (or **Lock Lane & Cashier Handover** on the
manager screen) locks the terminal; any cashier's PIN unlocks it, which is how a
mid-shift handover works without a full re-auth.

## Scripts

| Script                 | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Local dev server                                           |
| `npm run build`        | Production Next build                                      |
| `npm run typecheck`    | `tsc --noEmit`                                             |
| `npm run lint`         | ESLint                                                     |
| `npm run check:totals` | Asserts the cart engine against the design's figures       |
| `npm run preview`      | Build for Cloudflare and serve it on the real Workers runtime |
| `npm run deploy`       | Build and deploy to Cloudflare Workers                     |
| `npm run cf:typegen`   | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc`     |

## Screens

| Route       | Screen                | Notes                                                          |
| ----------- | --------------------- | -------------------------------------------------------------- |
| `/login`    | Cashier sign-in       | New — not in the supplied designs, built from the same tokens   |
| `/register` | Active Register       | Receipt tape, fast keys, scale HUD, function matrix             |
| `/plu`      | Produce PLU Lookup    | Search, A–Z, categories, scale dock, live item maths            |
| `/tender`   | Tender & Payment      | Six tender methods, cash pad, EBT split, receipt modal          |
| `/manager`  | Manager & Shift       | KPIs, drawer reconciliation, safe drops, overrides, diagnostics |
| `/offline`  | Offline fallback      | Served by the service worker when a navigation fails            |

### Function keys

`F2` void line · `F3` quantity · `F4` price check · `F7` hold cart · `F12` tender.
On the tender screen: `F5` card · `F6` cash · `F8` EBT cash · `F9` drawer kick ·
`Esc` back to cart. Browser defaults are suppressed — F12 opening devtools
mid-transaction would be a real incident.

---

## Architecture

```
src/
  app/
    (pos)/               auth-gated screens, sharing one cart + session
    login/               sign-in
    offline/             PWA fallback
  components/
    shell/               header, footer, lock overlay, toast
    register/ plu/ tender/ manager/    one folder per screen
    ui/                  Icon, Avatar, ProduceArt, PwaRegister
  lib/
    types.ts             domain model — money is integer cents everywhere
    money.ts             cart maths: line pricing, totals, tax, formatting
    data/                catalog + session dummy data behind an adapter
    auth/                auth provider behind an interface
    store/               React state: cart (pos-store), session (session-store)
    supabase/            client, server and proxy helpers (phase 2)
```

### Two seams, and only two

Everything that will become Supabase sits behind one of these:

- **`lib/data/adapter.ts`** — `PosDataAdapter`: products, member lookup, open
  cart, shift summary, recording a transaction.
- **`lib/auth/types.ts`** — `AuthProvider`: `signIn`, `verifyPin`, `signOut`.

`lib/data/index.ts` and `lib/auth/index.ts` each pick an implementation. Phase 2
means writing `supabaseAdapter` / `supabaseAuth` and returning them from those
two functions. No screen or component imports a data source directly.

### Money

All amounts are **integer cents**. Floating-point dollars drift across the
thousands of transactions a lane runs in a shift, and a one-cent drawer variance
is a real incident. Convert only at the display boundary, via `formatMoney()`.

### A note on the design's arithmetic

The register mockup's footer reads `$47.08 − $1.00 + $0.52 = $46.60`. Its
`$47.08` subtotal is already net of the butter line's `−$1.00` promo, so that
dollar comes off twice; and `$0.52` matches no combination of tax and deposit on
its own line items. A till has to balance, so the engine computes the total
rather than reproducing the artwork's:

```
subtotal = sum of the tape's Total column   (net of line promos, incl. deposits)
total    = subtotal − member coupons + tax  (tax on non-SNAP merchandise only,
                                             container deposits are not taxed)
```

Everything else reproduces the design exactly — every line total, the `$47.08`
subtotal, the `$40.49` SNAP-eligible portion, `8 items`, `6.61 lbs`.
`npm run check:totals` asserts all of it.

The two source screens also disagree on Honeycrisp apples ($2.49/lb on the
register tape, $2.99/lb on the PLU card). The catalog uses $2.99; the seeded cart
line keeps $2.49 as a price frozen at scan time — which is exactly why
`transaction_lines` denormalises name and price rather than joining to `products`.

### Radii

`DESIGN.md`'s frontmatter is the source of truth (`DEFAULT` 4px, `lg` 8px,
`full` 9999px). It matches the written spec — *"0.25rem/4px base to 0.5rem/8px
container radius"*, pill-round status dots and avatars — whereas the generated
HTML shipped a scale shifted one step down.

---

## PWA

`public/manifest.webmanifest` + `public/sw.js`. The service worker registers in
production only. Navigations are **network-first** with the cached shell as the
offline fallback, so a cashier never works from a stale screen; build output and
fonts are cache-first.

Icons live in `public/icons/` (192, 512, maskable 512, apple-touch). To rebrand,
replace those four files — the manifest and `layout.tsx` already reference them.

Fonts load as stylesheet `<link>`s rather than through `next/font` so the build
never needs network access to Google Fonts (CI, air-gapped runners, some
Cloudflare build images). Every family has a real system fallback stack.

---

## Deploying to Cloudflare

```bash
npm run preview        # build + serve on the real Workers runtime, locally
npm run deploy         # build + deploy
```

`wrangler.jsonc` holds the Worker config. The build has been verified end to end
on workerd — all routes, assets and the CSS bundle serve correctly.

`NEXT_PUBLIC_*` values are **inlined at build time**, so they must be present in
the environment when `npm run deploy` runs — not only as Worker secrets. Put
them in `.env.local` locally, or in your CI environment.

Non-public secrets go in as Worker secrets:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

> `opennextjs-cloudflare` warns that Node.js middleware support is experimental.
> `src/proxy.ts` is a deliberate no-op in phase 1 — it only starts doing work
> once the Supabase env vars are set. If that warning ever becomes a problem you
> can delete the file and handle session refresh in the screens instead.

---

## Phase 2 — wiring Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql`, then `supabase/seed.sql` in the SQL editor.
3. Create an auth user per cashier (Authentication → Add user), insert the
   matching `cashiers` rows with those UUIDs, and set PINs with
   `select set_cashier_pin('<uuid>', '4821');` — the commented block at the foot
   of `seed.sql` has the exact statements.
4. Copy `.env.example` to `.env.local` and fill in the URL and anon key.
5. Implement `supabaseAdapter` (`PosDataAdapter`) and `supabaseAuth`
   (`AuthProvider`), then return them from `lib/data/index.ts` and
   `lib/auth/index.ts`.
6. Set `NEXT_PUBLIC_POS_DATA_SOURCE=supabase` and `NEXT_PUBLIC_POS_AUTH=supabase`.

### What the schema gives you

Tables: `lanes`, `cashiers`, `products`, `members`, `shifts`, `transactions`,
`transaction_lines`, `tenders`, `safe_drops`, `override_log`, `drawer_counts`.

RLS is on for every table. Anonymous visitors see nothing. A cashier sees their
own shifts and transactions; supervisors and managers see the lane's. Child rows
(`transaction_lines`, `tenders`) inherit access from their parent transaction.

PINs are stored as bcrypt hashes and checked by the `verify_cashier_pin(badge,
pin)` SQL function, so a hash never reaches the browser. The demo PINs in
`lib/data/session.ts` are plaintext because nothing is persisted in phase 1 —
**do not carry that pattern into phase 2.**

### Before this runs a real lane

The phase-1 build is a faithful, working conversion, not a certified register.
Worth doing first:

- Confirm the tax treatment against Philippine requirements — the engine ships
  the design's US-style 6.25 % sales tax on non-food items plus SNAP/EBT
  eligibility, which is almost certainly not what Restohub needs. `TAX_RATE` and
  `computeTotals()` in `lib/money.ts` are where VAT would go.
- Replace the simulated scale HUD with a real scale integration.
- Decide on offline transaction queuing — the shell caches, but a tender made
  while offline is not yet queued for replay.
