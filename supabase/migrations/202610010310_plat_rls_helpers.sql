-- M1-P1 step 2: the `private` helper functions every RLS policy uses
-- (docs/spec/permissions.md section 3). Names and signatures are a contract between workstreams.
--
-- All are SECURITY DEFINER with an empty search_path, so they read tenancy tables regardless of
-- the caller's own policies (no recursion) and cannot be hijacked through a search path. Every
-- object they touch is schema-qualified. Policies call them as `(select private.fn(...))` so
-- Postgres evaluates them once per statement.
--
-- Helpers that read tables owned by later tasks (teacher_assignments, student_guardians,
-- guardians, students, impersonation_sessions) look the table and its columns up first and
-- return false while they are missing. They therefore work unchanged the moment those tables
-- exist, and no follow-up migration is needed.
-- Forward-only: never edit this file once applied.

-- ---------------------------------------------------------------------------
-- Does a table exist with all of these columns? Used to guard helpers over later tables.
-- ---------------------------------------------------------------------------
create function private.table_has_columns(tbl text, cols text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select count(*) = cardinality(cols)
  from pg_catalog.pg_attribute a
  where a.attrelid = to_regclass(tbl)
    and a.attname = any (cols)
    and a.attnum > 0
    and not a.attisdropped;
$$;

comment on function private.table_has_columns(text, text[]) is
  'True when the table (schema-qualified name) exists and has every listed column. '
  'Guard for helpers over tables that later tasks create.';

-- ---------------------------------------------------------------------------
-- Who is calling
-- ---------------------------------------------------------------------------
create function private.uid()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;

comment on function private.uid() is 'The signed-in user id (auth.uid()), or null when not signed in.';

create function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.profile_id = (select auth.uid())
  );
$$;

comment on function private.is_platform_admin() is
  'True when the caller is a platform owner (has a row in platform_admins).';

-- ---------------------------------------------------------------------------
-- Impersonation: a platform owner may act inside one institution only through an active,
-- unexpired, unended session (table arrives with M1-P3). need_write demands write_access.
-- ---------------------------------------------------------------------------
create function private.impersonating(inst uuid, need_write boolean default false)
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
  if uid is null or inst is null then
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

comment on function private.impersonating(uuid, boolean) is
  'True when the caller is a platform owner with an active impersonation session for the '
  'institution (with write access when need_write). False while the sessions table does not exist.';

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create function private.has_role(inst uuid, roles text[])
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or inst is null or roles is null then
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

comment on function private.has_role(uuid, text[]) is
  'READ check: an active membership in the institution with one of the roles, or a platform '
  'owner with an active impersonation session for it. Use in select policies and in using() of '
  'read paths. For insert, update and delete use private.has_role_write.';

create function private.has_role_write(inst uuid, roles text[])
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or inst is null or roles is null then
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

comment on function private.has_role_write(uuid, text[]) is
  'WRITE check: like has_role, but an impersonating platform owner passes only when the '
  'session has write_access. Use in insert, update and delete policies (using and with check). '
  'Added to enforce "read only unless write_access" from permissions.md section 3.';

-- ---------------------------------------------------------------------------
-- Teacher, guardian and student scope (tables from WS-ACAD; false until they exist)
-- ---------------------------------------------------------------------------
create function private.is_teacher_of_section(inst uuid, section uuid)
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
  if uid is null or inst is null or section is null then
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

comment on function private.is_teacher_of_section(uuid, uuid) is
  'True when the caller is an active teacher with any assignment (subject or class teacher) '
  'in the section. False while teacher_assignments does not exist.';

create function private.teaches(inst uuid, section uuid, subject uuid)
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
  if uid is null or inst is null or section is null or subject is null then
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

comment on function private.teaches(uuid, uuid, uuid) is
  'True when the caller is an active teacher assigned to this subject in this section '
  '(subject_id equals the argument; a class-teacher row with a null subject does not count). '
  'False while teacher_assignments does not exist.';

create function private.guardian_of_student(inst uuid, student uuid)
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
  if uid is null or inst is null or student is null then
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

comment on function private.guardian_of_student(uuid, uuid) is
  'True when the caller is an active guardian (membership role guardian) linked to the student '
  'through student_guardians. False while those tables do not exist.';

create function private.is_student_self(inst uuid, student uuid)
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
  if uid is null or inst is null or student is null then
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

comment on function private.is_student_self(uuid, uuid) is
  'True when the caller is the active student whose students.profile_id is the caller. '
  'False while students (or its profile_id column) does not exist.';

-- ---------------------------------------------------------------------------
-- Privileges: callable by signed-in users (policies run as the caller) and server code only.
-- ---------------------------------------------------------------------------
revoke execute on function
  private.table_has_columns(text, text[]),
  private.uid(),
  private.is_platform_admin(),
  private.impersonating(uuid, boolean),
  private.has_role(uuid, text[]),
  private.has_role_write(uuid, text[]),
  private.is_teacher_of_section(uuid, uuid),
  private.teaches(uuid, uuid, uuid),
  private.guardian_of_student(uuid, uuid),
  private.is_student_self(uuid, uuid)
  from public;

grant usage on schema private to authenticated, service_role;

grant execute on function
  private.table_has_columns(text, text[]),
  private.uid(),
  private.is_platform_admin(),
  private.impersonating(uuid, boolean),
  private.has_role(uuid, text[]),
  private.has_role_write(uuid, text[]),
  private.is_teacher_of_section(uuid, uuid),
  private.teaches(uuid, uuid, uuid),
  private.guardian_of_student(uuid, uuid),
  private.is_student_self(uuid, uuid)
  to authenticated, service_role;
