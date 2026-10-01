-- M0-P3 step 1: core tenancy tables (institutions, profiles, memberships) in their final
-- shape per docs/spec/domain-model.md section 2. M1-P1 extends these; it must not rewrite them.
-- Forward-only: fix mistakes with a new migration, never by editing this file.

-- ---------------------------------------------------------------------------
-- Trigger: institution_id is immutable on tenant tables (domain-model section 1).
-- ---------------------------------------------------------------------------
create or replace function private.forbid_institution_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.institution_id is distinct from old.institution_id then
    raise exception 'institution_id is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- institutions (the tenant itself; no institution_id)
-- ---------------------------------------------------------------------------
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name_bn text,
  name_en text,
  slug text not null unique,
  type text not null default 'school',
  status text not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint institutions_slug_format check (slug ~ '^[a-z0-9-]{3,40}$'),
  constraint institutions_type_check check (type in ('school', 'madrasa', 'coaching', 'other')),
  constraint institutions_status_check check (status in ('trial', 'active', 'suspended')),
  constraint institutions_name_present check (
    length(btrim(coalesce(name_bn, ''))) > 0 or length(btrim(coalesce(name_en, ''))) > 0
  )
);

create trigger set_updated_at before update on public.institutions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (not a tenant table): one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone_e164 text unique,
  locale text not null default 'bn',
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint profiles_phone_format check (phone_e164 is null or phone_e164 ~ '^\+8801[3-9][0-9]{8}$'),
  constraint profiles_locale_check check (locale in ('bn', 'en')),
  constraint profiles_full_name_present check (length(btrim(full_name)) > 0)
);

create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- memberships (tenant table): which profile has which role in which institution
-- ---------------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  status text not null default 'active',
  username text,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint memberships_role_check check (
    role in ('institution_admin', 'teacher', 'accountant', 'guardian', 'student')
  ),
  constraint memberships_status_check check (status in ('invited', 'active', 'suspended')),
  constraint memberships_tenant_id_unique unique (institution_id, id),
  constraint memberships_one_role_per_profile unique (institution_id, profile_id, role)
);

create unique index memberships_username_per_institution
  on public.memberships (institution_id, username) where username is not null;
create index memberships_profile_id_idx on public.memberships (profile_id);

create trigger set_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.memberships
  for each row execute function private.forbid_institution_id_change();

-- ---------------------------------------------------------------------------
-- RLS. A signed-in user reads only their own profile, their own memberships and the
-- institutions they hold an active membership in. There are no insert/update/delete
-- policies: clients cannot write these tables (admin flows arrive with M1-P2, through
-- server code). Isolation lives here, never in app code.
-- ---------------------------------------------------------------------------
alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

-- Table privileges: nothing for anon; read-only for signed-in users (RLS narrows the rows).
revoke all on public.institutions, public.profiles, public.memberships from anon, authenticated;
grant select on public.institutions, public.profiles, public.memberships to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy memberships_select_own on public.memberships
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy institutions_select_member on public.institutions
  for select to authenticated
  using (
    id in (
      select m.institution_id
      from public.memberships m
      where m.profile_id = (select auth.uid()) and m.status = 'active'
    )
  );
