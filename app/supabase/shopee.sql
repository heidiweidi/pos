-- Shopee product sync (add-on). Safe to re-run.
-- Run in the Supabase SQL editor on an existing project; also appended to schema.sql.

-- Where each product came from, so Manage Products can show and filter by it.
alter table products add column if not exists source         text not null default 'manual' check (source in ('manual', 'shopee'));
alter table products add column if not exists external_id    text;
alter table products add column if not exists last_synced_at timestamptz;
-- Units available on Shopee at the last sync (informational; the POS does not decrement it).
alter table products add column if not exists stock_qty      integer check (stock_qty >= 0);

-- One local row per Shopee item/variation. Manual products have a null external_id,
-- and Postgres lets many nulls through a unique constraint.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_source_external_key') then
    alter table products add constraint products_source_external_key unique (source, external_id);
  end if;
end $$;

-- Integration credentials (partner key, access/refresh tokens). RLS is on with NO
-- policies, so no browser session — not even a manager's — can read it. Only the
-- server, using the service-role key, touches this table.
create table if not exists integration_secrets (
  provider    text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table integration_secrets enable row level security;
revoke all on integration_secrets from anon, authenticated;
