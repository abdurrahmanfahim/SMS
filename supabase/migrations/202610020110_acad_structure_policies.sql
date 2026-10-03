-- M1-A1 step 1b: row level security for the academic structure tables, per the matrix row
-- "academic structure" in docs/spec/permissions.md section 2:
--   institution admin F; teacher, accountant, student R; platform owner R through an
--   impersonation session (inside private.has_role / has_role_write).
-- Guardians are NOT given a policy here: the matrix says "R*" (own children), and that scope
-- needs enrollments and student_guardians, which arrive with M1-A2. M1-A2 adds the guardian
-- read policies (see docs/reports/M1-A1.md, Requests).
-- teacher_assignments is not readable by students: who teaches whom is not part of what the
-- matrix gives a student, so it stays staff-only (assumption, see the report).
-- Forward-only: never edit this file once applied.

-- ---------------------------------------------------------------------------
-- Enable RLS and set privileges (rls-patterns.md section 3)
-- ---------------------------------------------------------------------------
alter table public.academic_years enable row level security;
alter table public.class_levels enable row level security;
alter table public.sections enable row level security;
alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security;
alter table public.teacher_assignments enable row level security;

revoke all on public.academic_years, public.class_levels, public.sections, public.subjects,
  public.class_subjects, public.teacher_assignments from public, anon, authenticated;
grant select, insert, update, delete on public.academic_years, public.class_levels,
  public.sections, public.subjects, public.class_subjects, public.teacher_assignments
  to authenticated;
grant select, insert, update, delete on public.academic_years, public.class_levels,
  public.sections, public.subjects, public.class_subjects, public.teacher_assignments
  to service_role;

-- ---------------------------------------------------------------------------
-- Policies. Reads: admin, teacher, accountant, student. Writes: institution admin only.
-- ---------------------------------------------------------------------------
create policy academic_years_select on public.academic_years for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin', 'teacher', 'accountant', 'student'])));
create policy academic_years_insert on public.academic_years for insert to authenticated
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy academic_years_update on public.academic_years for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy academic_years_delete on public.academic_years for delete to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])));

create policy class_levels_select on public.class_levels for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin', 'teacher', 'accountant', 'student'])));
create policy class_levels_insert on public.class_levels for insert to authenticated
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy class_levels_update on public.class_levels for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy class_levels_delete on public.class_levels for delete to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])));

create policy sections_select on public.sections for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin', 'teacher', 'accountant', 'student'])));
create policy sections_insert on public.sections for insert to authenticated
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy sections_update on public.sections for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy sections_delete on public.sections for delete to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])));

create policy subjects_select on public.subjects for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin', 'teacher', 'accountant', 'student'])));
create policy subjects_insert on public.subjects for insert to authenticated
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy subjects_update on public.subjects for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy subjects_delete on public.subjects for delete to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])));

create policy class_subjects_select on public.class_subjects for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin', 'teacher', 'accountant', 'student'])));
create policy class_subjects_insert on public.class_subjects for insert to authenticated
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy class_subjects_update on public.class_subjects for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy class_subjects_delete on public.class_subjects for delete to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])));

create policy teacher_assignments_select on public.teacher_assignments for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin', 'teacher', 'accountant'])));
create policy teacher_assignments_insert on public.teacher_assignments for insert to authenticated
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy teacher_assignments_update on public.teacher_assignments for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy teacher_assignments_delete on public.teacher_assignments for delete to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])));

-- ---------------------------------------------------------------------------
-- Make one year the current one in a single transaction. Two separate updates from the client
-- could leave an institution with no current year (or trip the one-current-year index), so the
-- switch is one function. SECURITY INVOKER: the caller's own RLS decides whether it may update.
-- ---------------------------------------------------------------------------
create function public.set_current_academic_year(p_year_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inst uuid;
begin
  select y.institution_id into inst from public.academic_years y where y.id = p_year_id;
  if inst is null then
    raise exception 'academic year not found or not allowed' using errcode = 'P0002';
  end if;
  update public.academic_years set is_current = false
  where institution_id = inst and is_current and id <> p_year_id;
  update public.academic_years set is_current = true
  where institution_id = inst and id = p_year_id;
  if not found then
    raise exception 'academic year not found or not allowed' using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.set_current_academic_year(uuid) is
  'Makes the given year the institution''s only current year. SECURITY INVOKER, so RLS decides '
  'who may call it effectively (institution admins only).';

revoke execute on function public.set_current_academic_year(uuid) from public, anon;
grant execute on function public.set_current_academic_year(uuid) to authenticated, service_role;
