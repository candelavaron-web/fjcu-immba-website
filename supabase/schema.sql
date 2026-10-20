-- =============================================================
-- FJCU imMBA — Supabase schema (AI-ADPD class #6)
-- Run this in the Supabase SQL Editor: New query → paste → Run.
-- Creates: faculty table, admin profiles with roles, row level
-- security policies and the storage bucket for faculty photos.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Faculty table (slide 15)
-- -------------------------------------------------------------
create table if not exists public.faculty (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,                 -- English name
  name_zh         text,                          -- 中文姓名
  title           text,                          -- academic title (EN)
  title_zh        text,
  education       text,                          -- highest degree (EN)
  education_zh    text,
  research_fields text,                          -- comma-separated (EN)
  research_zh     text,
  email           text,
  phone           text,                          -- extension / office
  website         text,
  image_url       text,                          -- Supabase Storage public URL
  category        text not null default 'full'   -- full | part
                  check (category in ('full', 'part')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists faculty_sort_idx on public.faculty (category, sort_order);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists faculty_touch_updated_at on public.faculty;
create trigger faculty_touch_updated_at
  before update on public.faculty
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------
-- 2. Administrators and roles (slides 17–18)
--    pending     → registered + verified, no back-office access
--    admin       → may manage website content
--    super_admin → may approve or reject other administrators
-- -------------------------------------------------------------
create table if not exists public.admin_profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'pending'
             check (role in ('pending', 'admin', 'super_admin')),
  created_at timestamptz not null default now()
);

-- every new signup starts as "pending"
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers. security definer so the policies below do not recurse
-- into admin_profiles while they are being evaluated.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- -------------------------------------------------------------
-- 3. Row level security
-- -------------------------------------------------------------
alter table public.faculty enable row level security;
alter table public.admin_profiles enable row level security;

-- faculty: anyone may read (the public website), only admins may write
drop policy if exists "faculty are viewable by everyone" on public.faculty;
create policy "faculty are viewable by everyone"
  on public.faculty for select
  using (true);

drop policy if exists "admins manage faculty" on public.faculty;
create policy "admins manage faculty"
  on public.faculty for all
  using (public.is_admin())
  with check (public.is_admin());

-- admin profiles: you always see your own row; super admins see everyone
drop policy if exists "read own profile" on public.admin_profiles;
create policy "read own profile"
  on public.admin_profiles for select
  using (id = auth.uid() or public.is_super_admin());

-- only super admins may change roles (approve / reject)
drop policy if exists "super admin updates profiles" on public.admin_profiles;
create policy "super admin updates profiles"
  on public.admin_profiles for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "super admin deletes profiles" on public.admin_profiles;
create policy "super admin deletes profiles"
  on public.admin_profiles for delete
  using (public.is_super_admin());

-- -------------------------------------------------------------
-- 4. Storage bucket for faculty photos
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('faculty-photos', 'faculty-photos', true)
on conflict (id) do nothing;

drop policy if exists "faculty photos are public" on storage.objects;
create policy "faculty photos are public"
  on storage.objects for select
  using (bucket_id = 'faculty-photos');

drop policy if exists "admins upload faculty photos" on storage.objects;
create policy "admins upload faculty photos"
  on storage.objects for insert
  with check (bucket_id = 'faculty-photos' and public.is_admin());

drop policy if exists "admins update faculty photos" on storage.objects;
create policy "admins update faculty photos"
  on storage.objects for update
  using (bucket_id = 'faculty-photos' and public.is_admin());

drop policy if exists "admins delete faculty photos" on storage.objects;
create policy "admins delete faculty photos"
  on storage.objects for delete
  using (bucket_id = 'faculty-photos' and public.is_admin());

-- =============================================================
-- 5. After running this file
--    a) Register in the back office (admin.html) and confirm the
--       verification email.
--    b) Run the line below, with your own email, to make yourself
--       the first super administrator:
--
--       update public.admin_profiles
--          set role = 'super_admin'
--        where email = 'you@example.com';
--
--    c) From then on, approve new administrators from the back
--       office itself.
-- =============================================================
