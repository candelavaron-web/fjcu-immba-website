-- =============================================================
-- FJCU imMBA — alumni database and audit trail (AI-ADPD class #7)
-- Run this in the Supabase SQL Editor after schema.sql.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Alumni (slide 7)
--    degree_program is constrained so the data stays clean:
--    the back office offers a dropdown, the database enforces it.
-- -------------------------------------------------------------
create table if not exists public.alumni (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  student_id      text unique,
  department      text,
  degree_program  text not null default 'Master'
                  check (degree_program in ('Bachelor', 'Master', 'Doctoral', 'Other')),
  admission_year  integer check (admission_year between 1950 and 2100),
  graduation_year integer check (graduation_year between 1950 and 2100),
  email           text,
  phone           text,
  company         text,
  job_title       text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists alumni_name_idx on public.alumni (full_name);
create index if not exists alumni_grad_idx on public.alumni (graduation_year desc);

drop trigger if exists alumni_touch_updated_at on public.alumni;
create trigger alumni_touch_updated_at
  before update on public.alumni
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------
-- 2. Audit trail (slides 10–12)
--    Who → did what → to which record → when → what changed.
-- -------------------------------------------------------------
create table if not exists public.audit_log (
  id            bigserial primary key,
  table_name    text not null,                       -- which table
  record_id     uuid,                                -- which record
  record_label  text,                                -- human readable (name / student id)
  action        text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  actor_id      uuid,                                -- who
  actor_email   text,
  changes       jsonb,                               -- {field: {from, to}}
  created_at    timestamptz not null default now()   -- when
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_record_idx on public.audit_log (table_name, record_id);

-- Writes one audit row per insert / update / delete, recording only
-- the fields that actually changed.
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor      uuid := auth.uid();
  actor_mail text;
  diff       jsonb := '{}'::jsonb;
  old_j      jsonb;
  new_j      jsonb;
  key        text;
  label      text;
begin
  select email into actor_mail from public.admin_profiles where id = actor;

  if tg_op = 'DELETE' then
    label := coalesce(old.full_name, '') || case when old.student_id is null then '' else ' (' || old.student_id || ')' end;
    insert into public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, changes)
    values (tg_table_name, old.id, label, 'DELETE', actor, actor_mail, to_jsonb(old));
    return old;
  end if;

  label := coalesce(new.full_name, '') || case when new.student_id is null then '' else ' (' || new.student_id || ')' end;

  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, changes)
    values (tg_table_name, new.id, label, 'CREATE', actor, actor_mail, to_jsonb(new));
    return new;
  end if;

  -- UPDATE: keep only the fields whose value changed
  old_j := to_jsonb(old);
  new_j := to_jsonb(new);
  for key in select jsonb_object_keys(new_j) loop
    if key not in ('updated_at', 'created_at')
       and coalesce(old_j -> key, 'null'::jsonb) is distinct from coalesce(new_j -> key, 'null'::jsonb) then
      diff := diff || jsonb_build_object(key, jsonb_build_object('from', old_j -> key, 'to', new_j -> key));
    end if;
  end loop;

  if diff <> '{}'::jsonb then
    insert into public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, changes)
    values (tg_table_name, new.id, label, 'UPDATE', actor, actor_mail, diff);
  end if;
  return new;
end;
$$;

drop trigger if exists alumni_audit on public.alumni;
create trigger alumni_audit
  after insert or update or delete on public.alumni
  for each row execute function public.log_audit();

-- -------------------------------------------------------------
-- 3. Row level security
--    Alumni records are internal data: only administrators may
--    read or write them. The audit trail is read-only — nobody
--    can edit history, it is written by the trigger above.
-- -------------------------------------------------------------
alter table public.alumni enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "admins read alumni" on public.alumni;
create policy "admins read alumni"
  on public.alumni for select
  using (public.is_admin());

drop policy if exists "admins manage alumni" on public.alumni;
create policy "admins manage alumni"
  on public.alumni for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins read the audit trail" on public.audit_log;
create policy "admins read the audit trail"
  on public.audit_log for select
  using (public.is_admin());
