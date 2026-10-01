-- M1-P1 step 1: institution_settings, platform_admins and the append-only audit_log
-- (docs/spec/domain-model.md section 2). Policies arrive in a later migration of this task;
-- until then RLS is on and nothing is granted to API roles, so everything is denied by default.
-- Forward-only: fix mistakes with a new migration, never by editing this file.

-- ---------------------------------------------------------------------------
-- institution_settings: one row per institution. institution_id is the primary key, so this
-- table has no separate `id` (the one deliberate exception to the "tenant table has id" rule).
-- ---------------------------------------------------------------------------
create table public.institution_settings (
  institution_id uuid primary key references public.institutions (id) on delete cascade,
  academic_year_style text not null default 'gregorian',
  weekly_holidays smallint[] not null default '{5}',
  use_bangla_digits boolean not null default true,
  attendance_edit_window_days smallint not null default 2,
  letterhead jsonb not null default '{}',
  -- foreign key to grade_schemes is added by the exam migrations (WS-EXAM)
  default_grade_scheme_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint institution_settings_year_style_check
    check (academic_year_style in ('gregorian', 'hijri', 'custom')),
  constraint institution_settings_weekly_holidays_check
    check (weekly_holidays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  constraint institution_settings_edit_window_check
    check (attendance_edit_window_days between 0 and 30),
  constraint institution_settings_letterhead_object
    check (jsonb_typeof(letterhead) = 'object')
);

create trigger set_updated_at before update on public.institution_settings
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.institution_settings
  for each row execute function private.forbid_institution_id_change();

-- Every institution always has a settings row (defaults), so readers never meet a missing row.
create function private.create_default_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.institution_settings (institution_id) values (new.id)
  on conflict (institution_id) do nothing;
  return new;
end;
$$;

create trigger create_default_settings after insert on public.institutions
  for each row execute function private.create_default_settings();

insert into public.institution_settings (institution_id)
select id from public.institutions
on conflict (institution_id) do nothing;

-- ---------------------------------------------------------------------------
-- platform_admins: the platform owners. Never writable from a client; rows are created by
-- server code (service role) only.
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create trigger set_updated_at before update on public.platform_admins
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_log: append-only. Three layers keep it that way:
--   1. no update, delete or truncate privilege for any API role (below);
--   2. triggers that raise on update, delete and truncate, which also stop the owner role;
--   3. RLS with no insert policy, so a client cannot write rows at all (rows come from
--      private.audit_row_change() and from server code).
-- institution_id has no foreign key on purpose: the log must outlive the institution, and a
-- cascading or nulling foreign key would have to update or delete log rows.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  institution_id uuid,
  actor_profile_id uuid,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint audit_log_actor_role_check check (
    actor_role in ('platform_owner', 'institution_admin', 'teacher', 'accountant',
                   'guardian', 'student', 'system')
  ),
  constraint audit_log_action_present check (length(btrim(action)) > 0),
  constraint audit_log_entity_type_present check (length(btrim(entity_type)) > 0),
  constraint audit_log_meta_object check (jsonb_typeof(meta) = 'object')
);

create index audit_log_institution_created_idx on public.audit_log (institution_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

create function private.forbid_audit_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only: % is not allowed', tg_op using errcode = '42501';
end;
$$;

create trigger audit_log_no_update_delete before update or delete on public.audit_log
  for each row execute function private.forbid_audit_log_change();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function private.forbid_audit_log_change();

-- ---------------------------------------------------------------------------
-- RLS on, default deny. Privileges are granted explicitly and only as far as needed; the
-- default privileges Supabase gives new public tables are revoked first.
-- ---------------------------------------------------------------------------
alter table public.institution_settings enable row level security;
alter table public.platform_admins enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.institution_settings, public.platform_admins, public.audit_log
  from public, anon, authenticated, service_role;

grant select, update on public.institution_settings to authenticated;
grant select, insert, update, delete on public.institution_settings to service_role;

grant select on public.platform_admins to authenticated;
grant select, insert, update, delete on public.platform_admins to service_role;

-- audit_log: read for signed-in users (RLS narrows it); insert for server code; nobody can
-- update, delete or truncate.
grant select on public.audit_log to authenticated;
grant select, insert on public.audit_log to service_role;
revoke all on sequence public.audit_log_id_seq from public, anon, authenticated, service_role;
grant usage on sequence public.audit_log_id_seq to service_role;
