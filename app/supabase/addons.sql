-- Add-on switches (Manage Add-ons). Safe to re-run.
-- Run this in the Supabase SQL editor on an existing project; it is also
-- appended to schema.sql for fresh installs.

create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

drop policy if exists "staff read settings" on app_settings;
create policy "staff read settings" on app_settings for select using (is_staff());

drop policy if exists "managers write settings" on app_settings;
create policy "managers write settings" on app_settings for all
  using (current_staff_role() = 'manager') with check (current_staff_role() = 'manager');
