-- ============================================================================
-- Restohub POS — phase 2 schema
--
-- Run this in the Supabase SQL editor (or `supabase db push`) before flipping
-- NEXT_PUBLIC_POS_DATA_SOURCE to "supabase".
--
-- Money is stored as integer cents throughout, matching src/lib/types.ts.
-- Every table is RLS-protected: an anonymous visitor sees nothing, and a
-- signed-in cashier sees only what their role needs.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----
create type pricing_mode as enum ('scale', 'count');
create type tax_flag     as enum ('F', 'T');
create type staff_role   as enum ('cashier', 'supervisor', 'manager');
create type tender_kind  as enum ('cash', 'card', 'ebt_snap', 'ebt_cash', 'gift', 'wic');
create type txn_status   as enum ('open', 'held', 'settled', 'voided');
create type override_kind as enum ('price_override', 'post_tender_void', 'line_void', 'no_sale');

-- ---------------------------------------------------------------- lanes ----
create table lanes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,            -- 'L04'
  name        text not null,                   -- 'Lane 04'
  terminal    text not null default 'Main Terminal',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------- cashiers ---
-- Profile row for a Supabase Auth user. The PIN is stored only as a bcrypt
-- hash and is verified by the `verify_cashier_pin` function below, never by
-- shipping hashes to the browser.
create table cashiers (
  id          uuid primary key references auth.users (id) on delete cascade,
  badge       text not null unique,
  full_name   text not null,
  email       text not null,
  role        staff_role not null default 'cashier',
  pin_hash    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index cashiers_badge_idx on cashiers (badge);

-- -------------------------------------------------------------- products ---
create table products (
  id               uuid primary key default gen_random_uuid(),
  plu              text unique,
  upc              text unique,
  sku              text unique,
  name             text not null,
  subtitle         text,
  department       text not null,
  department_code  text not null,
  pricing_mode     pricing_mode not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  unit_label       text not null check (unit_label in ('lb', 'each')),
  tax_flag         tax_flag not null default 'F',
  ebt_eligible     boolean not null default true,
  deposit_cents    integer not null default 0 check (deposit_cents >= 0),
  organic          boolean not null default false,
  art              text,
  icon             text,
  icon_class       text,
  promo_label      text,
  categories       text[] not null default '{}',
  active           boolean not null default true,
  updated_at       timestamptz not null default now()
);

create index products_name_idx on products using gin (to_tsvector('simple', name));
create index products_plu_idx  on products (plu);
create index products_upc_idx  on products (upc);

-- ------------------------------------------------------- loyalty members ---
create table members (
  id               uuid primary key default gen_random_uuid(),
  account_number   text not null unique,
  full_name        text not null,
  tier             text not null default 'Member',
  points           integer not null default 0,
  reward_cents     integer not null default 0,
  email            text,
  phone            text,
  created_at       timestamptz not null default now()
);

create index members_phone_idx on members (phone);

-- ---------------------------------------------------------------- shifts ---
create table shifts (
  id                  uuid primary key default gen_random_uuid(),
  lane_id             uuid not null references lanes (id),
  cashier_id          uuid not null references cashiers (id),
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  opening_float_cents integer not null default 0,
  closing_count_cents integer,
  variance_cents      integer,
  status              text not null default 'open' check (status in ('open', 'closed'))
);

create index shifts_lane_open_idx on shifts (lane_id) where status = 'open';

-- ---------------------------------------------------------- transactions ---
create table transactions (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique,
  lane_id       uuid not null references lanes (id),
  shift_id      uuid references shifts (id),
  cashier_id    uuid not null references cashiers (id),
  member_id     uuid references members (id),
  status        txn_status not null default 'open',
  subtotal_cents  integer not null default 0,
  discount_cents  integer not null default 0,
  tax_cents       integer not null default 0,
  deposit_cents   integer not null default 0,
  total_cents     integer not null default 0,
  created_at    timestamptz not null default now(),
  settled_at    timestamptz
);

create index transactions_shift_idx  on transactions (shift_id);
create index transactions_status_idx on transactions (lane_id, status);

create table transaction_lines (
  id                uuid primary key default gen_random_uuid(),
  transaction_id    uuid not null references transactions (id) on delete cascade,
  product_id        uuid references products (id),
  -- Name and price are denormalised on purpose: a catalog edit next month must
  -- not rewrite what a customer was actually charged today.
  name              text not null,
  unit_price_cents  integer not null,
  unit_label        text not null,
  pricing_mode      pricing_mode not null,
  qty               integer not null default 1,
  weight_lb         numeric(8, 3),
  tare_lb           numeric(8, 3),
  tax_flag          tax_flag not null,
  ebt_eligible      boolean not null,
  deposit_cents     integer not null default 0,
  discount_label    text,
  discount_cents    integer not null default 0,
  override_cents    integer,
  voided            boolean not null default false,
  detail            text,
  position          integer not null default 0
);

create index transaction_lines_txn_idx on transaction_lines (transaction_id, position);

create table tenders (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references transactions (id) on delete cascade,
  kind            tender_kind not null,
  amount_cents    integer not null check (amount_cents > 0),
  tendered_cents  integer,
  change_cents    integer,
  reference       text,
  created_at      timestamptz not null default now()
);

create index tenders_txn_idx on tenders (transaction_id);

-- ------------------------------------------------------- shift operations --
create table safe_drops (
  id           uuid primary key default gen_random_uuid(),
  shift_id     uuid not null references shifts (id) on delete cascade,
  sequence     integer not null,
  envelope     text not null,
  amount_cents integer not null check (amount_cents > 0),
  verified_by  uuid references cashiers (id),
  created_at   timestamptz not null default now()
);

create table override_log (
  id           uuid primary key default gen_random_uuid(),
  shift_id     uuid not null references shifts (id) on delete cascade,
  kind         override_kind not null,
  title        text not null,
  detail       text,
  approved_by  uuid references cashiers (id),
  created_at   timestamptz not null default now()
);

create table drawer_counts (
  id            uuid primary key default gen_random_uuid(),
  shift_id      uuid not null references shifts (id) on delete cascade,
  denom_cents   integer,          -- null = the loose-coin row, entered as a total
  piece_count   integer not null default 0,
  subtotal_cents integer not null default 0,
  counted_at    timestamptz not null default now()
);

-- =============================================================== helpers ===

-- Role of the calling user, or null when signed out. SECURITY DEFINER so the
-- RLS policies below can consult `cashiers` without recursing into its own RLS.
create or replace function current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from cashiers where id = auth.uid() and active;
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from cashiers where id = auth.uid() and active);
$$;

create or replace function is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_staff_role() in ('supervisor', 'manager');
$$;

-- PIN verification for the terminal lock screen. Takes a badge + plaintext PIN,
-- returns the cashier row on success. The hash never leaves the database.
create or replace function verify_cashier_pin(p_badge text, p_pin text)
returns table (id uuid, badge text, full_name text, role staff_role)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  return query
  select c.id, c.badge, c.full_name, c.role
  from cashiers c
  where c.badge = p_badge
    and c.active
    and c.pin_hash is not null
    and c.pin_hash = crypt(p_pin, c.pin_hash);
end;
$$;

revoke all on function verify_cashier_pin(text, text) from public;
grant execute on function verify_cashier_pin(text, text) to authenticated;

-- Lock-screen variant: the terminal only has a PIN (and, for a self-unlock,
-- the currently signed-in cashier's id) — no badge. Tries every active PIN
-- hash, or just one cashier's when p_cashier_id narrows it. Called while a
-- cashier's Supabase Auth session is still live (the lock is a local overlay,
-- not a sign-out), so `authenticated` is enough.
create or replace function verify_cashier_pin_by_id(p_pin text, p_cashier_id uuid default null)
returns table (id uuid, badge text, full_name text, role staff_role)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  return query
  select c.id, c.badge, c.full_name, c.role
  from cashiers c
  where c.active
    and c.pin_hash is not null
    and c.pin_hash = crypt(p_pin, c.pin_hash)
    and (p_cashier_id is null or c.id = p_cashier_id)
  limit 1;
end;
$$;

revoke all on function verify_cashier_pin_by_id(text, uuid) from public;
grant execute on function verify_cashier_pin_by_id(text, uuid) to authenticated;

-- Convenience for seeding: store a PIN as a bcrypt hash.
create or replace function set_cashier_pin(p_cashier uuid, p_pin text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update cashiers set pin_hash = crypt(p_pin, gen_salt('bf')) where id = p_cashier;
$$;

revoke all on function set_cashier_pin(uuid, text) from public;

-- =================================================================== RLS ===
alter table lanes             enable row level security;
alter table cashiers          enable row level security;
alter table products          enable row level security;
alter table members           enable row level security;
alter table shifts            enable row level security;
alter table transactions      enable row level security;
alter table transaction_lines enable row level security;
alter table tenders           enable row level security;
alter table safe_drops        enable row level security;
alter table override_log      enable row level security;
alter table drawer_counts     enable row level security;

-- Reference data: any signed-in staff member may read; only managers may edit.
create policy "staff read lanes"    on lanes    for select using (is_staff());
create policy "managers write lanes" on lanes   for all
  using (current_staff_role() = 'manager') with check (current_staff_role() = 'manager');

create policy "staff read products" on products for select using (is_staff());
create policy "managers write products" on products for all
  using (current_staff_role() = 'manager') with check (current_staff_role() = 'manager');

create policy "staff read members"  on members  for select using (is_staff());
create policy "staff write members" on members  for insert with check (is_staff());
create policy "staff update members" on members for update using (is_staff());

-- Staff directory: a cashier sees their own row; supervisors see the roster.
create policy "read own cashier row" on cashiers for select
  using (id = auth.uid() or is_supervisor());
create policy "managers manage cashiers" on cashiers for all
  using (current_staff_role() = 'manager') with check (current_staff_role() = 'manager');

-- Shift-scoped data: own records, or anything for a supervisor.
create policy "read own shifts" on shifts for select
  using (cashier_id = auth.uid() or is_supervisor());
create policy "open own shift"  on shifts for insert with check (cashier_id = auth.uid());
create policy "update own shift" on shifts for update
  using (cashier_id = auth.uid() or is_supervisor());

create policy "read own transactions" on transactions for select
  using (cashier_id = auth.uid() or is_supervisor());
create policy "create own transactions" on transactions for insert
  with check (cashier_id = auth.uid());
create policy "update own transactions" on transactions for update
  using (cashier_id = auth.uid() or is_supervisor());

-- Child tables inherit access from their parent transaction.
create policy "lines follow transaction" on transaction_lines for all
  using (
    exists (
      select 1 from transactions t
      where t.id = transaction_id and (t.cashier_id = auth.uid() or is_supervisor())
    )
  )
  with check (
    exists (select 1 from transactions t where t.id = transaction_id and t.cashier_id = auth.uid())
  );

create policy "tenders follow transaction" on tenders for all
  using (
    exists (
      select 1 from transactions t
      where t.id = transaction_id and (t.cashier_id = auth.uid() or is_supervisor())
    )
  )
  with check (
    exists (select 1 from transactions t where t.id = transaction_id and t.cashier_id = auth.uid())
  );

create policy "drops follow shift" on safe_drops for all
  using (exists (select 1 from shifts s where s.id = shift_id and (s.cashier_id = auth.uid() or is_supervisor())))
  with check (is_supervisor());

create policy "overrides follow shift" on override_log for all
  using (exists (select 1 from shifts s where s.id = shift_id and (s.cashier_id = auth.uid() or is_supervisor())))
  with check (is_staff());

create policy "counts follow shift" on drawer_counts for all
  using (exists (select 1 from shifts s where s.id = shift_id and (s.cashier_id = auth.uid() or is_supervisor())))
  with check (exists (select 1 from shifts s where s.id = shift_id and s.cashier_id = auth.uid()));
