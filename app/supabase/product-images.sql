-- Product photos and multi-buy pricing. Safe to re-run.
-- Run in the Supabase SQL editor on an existing project; also appended to
-- schema.sql for fresh installs.

alter table products add column if not exists image_url        text;
alter table products add column if not exists bulk_qty         integer check (bulk_qty >= 2);
alter table products add column if not exists bulk_price_cents integer check (bulk_price_cents >= 0);

-- Public bucket for the photos. The app shrinks every photo to a small square
-- WebP before upload; the 100 KB cap and image-only types are enforced here too,
-- so nothing larger can be stored even by a hand-made request.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 102400, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images readable" on storage.objects;
create policy "product images readable" on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "managers add product images" on storage.objects;
create policy "managers add product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and current_staff_role() = 'manager');

drop policy if exists "managers replace product images" on storage.objects;
create policy "managers replace product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and current_staff_role() = 'manager');

drop policy if exists "managers delete product images" on storage.objects;
create policy "managers delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and current_staff_role() = 'manager');
