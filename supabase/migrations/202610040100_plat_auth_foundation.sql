-- M1-P2 step 1-6 (database part): forced password change, invites, sign-in attempt log with
-- lockout, and the admin policies on memberships and profiles (Leader ruling R-14).
-- Forward-only: never edit this file once applied.
--
-- Auth design is in docs/decisions/0006-auth.md: every login is a Supabase Auth user with a
-- synthetic email that only server code knows; people sign in with a phone number or
-- `institution-slug/username` through the `sign-in` Edge Function, which resolves the identifier,
-- applies the lockout below and exchanges the password for a session.

-- ---------------------------------------------------------------------------
-- must_change_password gate. While the flag is true the caller is treated as having no role
-- anywhere: every private helper below returns false, so no policy that uses them lets the
-- caller read or write tenant data until the password is changed (D-05, M1-P2 step 4).
-- ---------------------------------------------------------------------------
create function private.must_change_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.must_change_password from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

comment on function private.must_change_password() is
  'True when the signed-in user must change their password first (temporary password issued by '
  'an admin). Every role helper returns false while it is true.';

-- The role helpers from M1-P1, redefined with one extra condition: not must_change_password().
-- Names, signatures and behaviour are otherwise unchanged (create or replace keeps the grants).
create or replace function private.impersonating(inst uuid, need_write boolean default false)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  active boolean;
begin
  if uid is null or private.must_change_password() or inst is null then
    return false;
  end if;
  if not private.table_has_columns(
    'public.impersonation_sessions',
    array['platform_admin_id', 'institution_id', 'write_access', 'started_at', 'expires_at', 'ended_at']
  ) then
    return false;
  end if;
  execute
    'select exists (
       select 1 from public.impersonation_sessions s
       where s.platform_admin_id = $1 and s.institution_id = $2
         and s.ended_at is null and s.started_at <= now() and s.expires_at > now()
         and (not $3 or s.write_access)
     )'
    into active
    using uid, inst, need_write;
  return coalesce(active, false) and private.is_platform_admin();
end;
$$;

create or replace function private.has_role(inst uuid, roles text[])
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or private.must_change_password() or inst is null or roles is null then
    return false;
  end if;
  if exists (
    select 1 from public.memberships m
    where m.institution_id = inst and m.profile_id = uid
      and m.status = 'active' and m.role = any (roles)
  ) then
    return true;
  end if;
  return private.impersonating(inst, false);
end;
$$;

create or replace function private.has_role_write(inst uuid, roles text[])
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or private.must_change_password() or inst is null or roles is null then
    return false;
  end if;
  if exists (
    select 1 from public.memberships m
    where m.institution_id = inst and m.profile_id = uid
      and m.status = 'active' and m.role = any (roles)
  ) then
    return true;
  end if;
  return private.impersonating(inst, true);
end;
$$;

create or replace function private.is_teacher_of_section(inst uuid, section uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found boolean;
begin
  if uid is null or private.must_change_password() or inst is null or section is null then
    return false;
  end if;
  if not private.table_has_columns(
    'public.teacher_assignments', array['institution_id', 'membership_id', 'section_id']
  ) then
    return false;
  end if;
  execute
    'select exists (
       select 1
       from public.teacher_assignments ta
       join public.memberships m
         on m.id = ta.membership_id and m.institution_id = ta.institution_id
       where ta.institution_id = $1 and ta.section_id = $2
         and m.profile_id = $3 and m.role = ''teacher'' and m.status = ''active''
     )'
    into found
    using inst, section, uid;
  return coalesce(found, false);
end;
$$;

create or replace function private.teaches(inst uuid, section uuid, subject uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found boolean;
begin
  if uid is null or private.must_change_password() or inst is null or section is null or subject is null then
    return false;
  end if;
  if not private.table_has_columns(
    'public.teacher_assignments',
    array['institution_id', 'membership_id', 'section_id', 'subject_id']
  ) then
    return false;
  end if;
  execute
    'select exists (
       select 1
       from public.teacher_assignments ta
       join public.memberships m
         on m.id = ta.membership_id and m.institution_id = ta.institution_id
       where ta.institution_id = $1 and ta.section_id = $2 and ta.subject_id = $3
         and m.profile_id = $4 and m.role = ''teacher'' and m.status = ''active''
     )'
    into found
    using inst, section, subject, uid;
  return coalesce(found, false);
end;
$$;

create or replace function private.guardian_of_student(inst uuid, student uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found boolean;
begin
  if uid is null or private.must_change_password() or inst is null or student is null then
    return false;
  end if;
  if not private.table_has_columns(
    'public.student_guardians', array['institution_id', 'student_id', 'guardian_id']
  ) or not private.table_has_columns(
    'public.guardians', array['id', 'institution_id', 'profile_id', 'deleted_at']
  ) then
    return false;
  end if;
  execute
    'select exists (
       select 1
       from public.student_guardians sg
       join public.guardians g
         on g.id = sg.guardian_id and g.institution_id = sg.institution_id
       join public.memberships m
         on m.institution_id = g.institution_id and m.profile_id = g.profile_id
       where sg.institution_id = $1 and sg.student_id = $2
         and g.profile_id = $3 and g.deleted_at is null
         and m.role = ''guardian'' and m.status = ''active''
     )'
    into found
    using inst, student, uid;
  return coalesce(found, false);
end;
$$;

create or replace function private.is_student_self(inst uuid, student uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found boolean;
begin
  if uid is null or private.must_change_password() or inst is null or student is null then
    return false;
  end if;
  -- ASSUMPTION: students.profile_id links a student row to the login (like guardians.profile_id).
  -- domain-model.md section 4 does not list it; WS-ACAD must add it (see report Requests).
  if not private.table_has_columns(
    'public.students', array['id', 'institution_id', 'profile_id', 'deleted_at']
  ) then
    return false;
  end if;
  execute
    'select exists (
       select 1
       from public.students s
       join public.memberships m
         on m.institution_id = s.institution_id and m.profile_id = s.profile_id
       where s.institution_id = $1 and s.id = $2
         and s.profile_id = $3 and s.deleted_at is null
         and m.role = ''student'' and m.status = ''active''
     )'
    into found
    using inst, student, uid;
  return coalesce(found, false);
end;
$$;


-- ---------------------------------------------------------------------------
-- invites: one row per invitation link. The token is never stored, only its sha256.
-- ---------------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  role text not null,
  token_hash text not null unique,
  target jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint invites_tenant_id_unique unique (institution_id, id),
  constraint invites_role_check check (
    role in ('institution_admin', 'teacher', 'accountant', 'guardian', 'student')
  ),
  constraint invites_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint invites_target_is_object check (jsonb_typeof(target) = 'object'),
  constraint invites_guardian_target check (
    role <> 'guardian' or (
      target ? 'guardian_id'
      and jsonb_typeof(target -> 'student_ids') = 'array'
      and jsonb_array_length(target -> 'student_ids') > 0
    )
  )
);

create index invites_institution_idx on public.invites (institution_id, created_at desc);

create trigger forbid_institution_id_change before update on public.invites
  for each row execute function private.forbid_institution_id_change();

alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;
grant select on public.invites to authenticated;

-- Admins read their institution's invites (matrix: memberships, profiles, invites). Nobody
-- writes through the API: tokens are generated and hashed in the Edge Functions (service role).
create policy invites_select_admin on public.invites
  for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin'])));

-- ---------------------------------------------------------------------------
-- Guardian invite targets. guardians and student_guardians arrive with M1-A2; until then these
-- two functions are permissive stand-ins that M1-A2 replaces with the real checks (they look the
-- tables up the same way the role helpers do).
-- ---------------------------------------------------------------------------
create function public.invite_target_ok(inst uuid, guardian uuid, students uuid[])
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ok boolean;
begin
  if not private.table_has_columns('public.guardians', array['id', 'institution_id', 'profile_id', 'deleted_at'])
     or not private.table_has_columns('public.student_guardians', array['institution_id', 'student_id', 'guardian_id']) then
    return true;
  end if;
  execute
    'select exists (
       select 1 from public.guardians g
       where g.id = $1 and g.institution_id = $2 and g.deleted_at is null and g.profile_id is null
     ) and not exists (
       select 1 from unnest($3) as s(id)
       where not exists (
         select 1 from public.student_guardians sg
         where sg.institution_id = $2 and sg.guardian_id = $1 and sg.student_id = s.id
       )
     )'
    into ok
    using guardian, inst, students;
  return coalesce(ok, false);
end;
$$;

create function public.invite_link_guardian(inst uuid, guardian uuid, profile uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not private.table_has_columns('public.guardians', array['id', 'institution_id', 'profile_id', 'deleted_at']) then
    return true;
  end if;
  execute
    'update public.guardians set profile_id = $3
      where id = $1 and institution_id = $2 and profile_id is null and deleted_at is null'
    using guardian, inst, profile;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

revoke all on function public.invite_target_ok(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.invite_link_guardian(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.invite_target_ok(uuid, uuid, uuid[]) to service_role;
grant execute on function public.invite_link_guardian(uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Sign-in attempt log and lockout (M1-P2 step 5). Only hashes are stored: identifier_hash is a
-- sha256 of the normalised identifier, ip_hash a sha256 of the caller address. No client
-- privilege at all; the Edge Functions call the two functions below with the service role.
-- Rules: 5 failures within 15 minutes lock an identifier for 15 minutes after its last failure;
-- 30 failures within 15 minutes lock an address the same way. A success clears the identifier.
-- ---------------------------------------------------------------------------
create table public.auth_attempts (
  id bigint generated always as identity primary key,
  identifier_hash text not null,
  ip_hash text,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

create index auth_attempts_identifier_idx on public.auth_attempts (identifier_hash, attempted_at desc);
create index auth_attempts_ip_idx on public.auth_attempts (ip_hash, attempted_at desc) where ip_hash is not null;

alter table public.auth_attempts enable row level security;
revoke all on public.auth_attempts from anon, authenticated;

create function public.auth_check_lockout(p_identifier_hash text, p_ip_hash text default null)
returns table (locked boolean, retry_after_seconds integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  window_len constant interval := interval '15 minutes';
  max_identifier_failures constant integer := 5;
  max_ip_failures constant integer := 30;
  last_success timestamptz;
  id_fail integer;
  id_last timestamptz;
  ip_fail integer;
  ip_last timestamptz;
  until_ts timestamptz := null;
begin
  select max(a.attempted_at) into last_success
    from public.auth_attempts a
   where a.identifier_hash = p_identifier_hash and a.succeeded;

  select count(*), max(a.attempted_at) into id_fail, id_last
    from public.auth_attempts a
   where a.identifier_hash = p_identifier_hash and not a.succeeded
     and a.attempted_at > now() - window_len
     and (last_success is null or a.attempted_at > last_success);
  if id_fail >= max_identifier_failures then
    until_ts := id_last + window_len;
  end if;

  if p_ip_hash is not null then
    select count(*), max(a.attempted_at) into ip_fail, ip_last
      from public.auth_attempts a
     where a.ip_hash = p_ip_hash and not a.succeeded and a.attempted_at > now() - window_len;
    if ip_fail >= max_ip_failures and (until_ts is null or ip_last + window_len > until_ts) then
      until_ts := ip_last + window_len;
    end if;
  end if;

  if until_ts is not null and until_ts > now() then
    return query select true, greatest(1, ceil(extract(epoch from (until_ts - now())))::integer);
  else
    return query select false, 0;
  end if;
end;
$$;

create function public.auth_record_attempt(p_identifier_hash text, p_ip_hash text, p_succeeded boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  insert into public.auth_attempts (identifier_hash, ip_hash, succeeded)
  values (p_identifier_hash, p_ip_hash, p_succeeded);
  -- Keep the log small: nothing older than a day is ever read.
  delete from public.auth_attempts where attempted_at < now() - interval '1 day';
end;
$$;

revoke all on function public.auth_check_lockout(text, text) from public, anon, authenticated;
revoke all on function public.auth_record_attempt(text, text, boolean) from public, anon, authenticated;
grant execute on function public.auth_check_lockout(text, text) to service_role;
grant execute on function public.auth_record_attempt(text, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Policies on memberships and profiles (Leader ruling R-14, M1-P2 step 6).
-- ---------------------------------------------------------------------------
-- Does the profile already belong to another institution? Used so that a client-side insert
-- cannot attach someone else's account to this institution; people who belong elsewhere are
-- added through the admin-create-user / accept-invite functions instead.
create function private.profile_in_other_institution(inst uuid, profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.profile_id = profile and m.institution_id <> inst
  );
$$;

-- memberships: institution admins read, create, update (including suspend) inside their own
-- institution. institution_id never changes (trigger from M0-P3) and profile_id is not an
-- updatable column. There is no delete: a membership is suspended, not removed.
create policy memberships_select_admin on public.memberships
  for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin'])));

create policy memberships_insert_admin on public.memberships
  for insert to authenticated
  with check (
    (select private.has_role_write(institution_id, array['institution_admin']))
    and not (select private.profile_in_other_institution(institution_id, profile_id))
  );

create policy memberships_update_admin on public.memberships
  for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));

grant insert (institution_id, profile_id, role, status, username, invited_by) on public.memberships to authenticated;
grant update (role, status, username) on public.memberships to authenticated;

-- profiles: everyone reads and updates only their own row; an institution admin also reads the
-- profiles of their members. Clients may change only full_name and locale: phone changes and
-- must_change_password go through server code.
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.profile_id = profiles.id
        and (select private.has_role(m.institution_id, array['institution_admin']))
    )
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant update (full_name, locale) on public.profiles to authenticated;
