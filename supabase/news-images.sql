-- =============================================================
-- FJCU imMBA — storage bucket for announcement images
-- Run this in the Supabase SQL Editor after schema.sql.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

drop policy if exists "news images are public" on storage.objects;
create policy "news images are public"
  on storage.objects for select
  using (bucket_id = 'news-images');

drop policy if exists "admins upload news images" on storage.objects;
create policy "admins upload news images"
  on storage.objects for insert
  with check (bucket_id = 'news-images' and public.is_admin());

drop policy if exists "admins update news images" on storage.objects;
create policy "admins update news images"
  on storage.objects for update
  using (bucket_id = 'news-images' and public.is_admin());

drop policy if exists "admins delete news images" on storage.objects;
create policy "admins delete news images"
  on storage.objects for delete
  using (bucket_id = 'news-images' and public.is_admin());
