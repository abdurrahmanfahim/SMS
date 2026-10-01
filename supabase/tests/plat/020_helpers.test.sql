-- M1-P1 step 7: the private helper functions (docs/spec/permissions.md section 3).
begin;

select plan(35);

select tests.create_fixture();

-- Run a helper as a user and return its result (act_as, evaluate, back to the owner role).
create function pg_temp.as_user(which text, role text, expr text)
returns boolean language plpgsql as $$
declare r boolean;
begin
  perform tests.act_as(which, role);
  execute 'select ' || expr into r;
  perform tests.reset();
  return r;
end;
$$;

-- uid and is_platform_admin ----------------------------------------------------
select is(pg_temp.as_user('a', 'teacher', 'private.uid() = tests.user_id(''a'', ''teacher'')'), true, 'uid returns the signed-in user');
select is((select private.uid()), null, 'uid is null for the owner role without a signed-in user');
select is(pg_temp.as_user('platform', 'platform_owner', 'private.is_platform_admin()'), true, 'platform owner is a platform admin');
select is(pg_temp.as_user('a', 'institution_admin', 'private.is_platform_admin()'), false, 'institution admin is not a platform admin');
select is(pg_temp.as_user('none', 'outsider', 'private.is_platform_admin()'), false, 'outsider is not a platform admin');

-- has_role: allowed role passes, other role fails, other tenant fails ---------------
select is(pg_temp.as_user('a', 'institution_admin', 'private.has_role(tests.inst(''a''), array[''institution_admin''])'), true, 'admin A has role institution_admin in A');
select is(pg_temp.as_user('a', 'teacher', 'private.has_role(tests.inst(''a''), array[''institution_admin''])'), false, 'teacher A does not have role institution_admin');
select is(pg_temp.as_user('a', 'teacher', 'private.has_role(tests.inst(''a''), array[''institution_admin'', ''teacher''])'), true, 'any role in the list is enough');
select is(pg_temp.as_user('a', 'institution_admin', 'private.has_role(tests.inst(''b''), array[''institution_admin''])'), false, 'admin A has no role in institution B');
select is(pg_temp.as_user('b', 'institution_admin', 'private.has_role(tests.inst(''a''), array[''institution_admin'', ''teacher'', ''accountant'', ''guardian'', ''student''])'), false, 'admin B has no role at all in A');
select is(pg_temp.as_user('none', 'outsider', 'private.has_role(tests.inst(''a''), array[''institution_admin''])'), false, 'outsider has no role');
select is(pg_temp.as_user('platform', 'platform_owner', 'private.has_role(tests.inst(''a''), array[''institution_admin''])'), false, 'platform owner has no role without an impersonation session');
select is(pg_temp.as_user('a', 'institution_admin', 'private.has_role(null, array[''institution_admin''])'), false, 'null institution is false');
select is(pg_temp.as_user('a', 'institution_admin', 'private.has_role(tests.inst(''a''), null)'), false, 'null roles is false');
select is(private.has_role(tests.inst('a'), array['institution_admin']), false, 'no signed-in user is false');

-- a suspended or invited membership grants nothing
update public.memberships set status = 'suspended'
where institution_id = tests.inst('a') and profile_id = tests.user_id('a', 'accountant');
update public.memberships set status = 'invited'
where institution_id = tests.inst('a') and profile_id = tests.user_id('a', 'guardian');
select is(pg_temp.as_user('a', 'accountant', 'private.has_role(tests.inst(''a''), array[''accountant''])'), false, 'suspended membership has no role');
select is(pg_temp.as_user('a', 'guardian', 'private.has_role(tests.inst(''a''), array[''guardian''])'), false, 'invited membership has no role');

-- a person with memberships in two institutions has each role only where granted
insert into public.memberships (institution_id, profile_id, role, status)
values (tests.inst('b'), tests.user_id('a', 'teacher'), 'accountant', 'active');
select is(pg_temp.as_user('a', 'teacher', 'private.has_role(tests.inst(''b''), array[''accountant''])'), true, 'a second membership grants its role in its own institution');
select is(pg_temp.as_user('a', 'teacher', 'private.has_role(tests.inst(''b''), array[''teacher''])'), false, 'and not the role held only in the other institution');

-- later tables do not exist yet: helpers return false instead of raising ------------
select is(pg_temp.as_user('a', 'teacher', 'private.is_teacher_of_section(tests.inst(''a''), gen_random_uuid())'), false, 'is_teacher_of_section is false while teacher_assignments is missing');
select is(pg_temp.as_user('a', 'teacher', 'private.teaches(tests.inst(''a''), gen_random_uuid(), gen_random_uuid())'), false, 'teaches is false while teacher_assignments is missing');
select is(pg_temp.as_user('a', 'guardian', 'private.guardian_of_student(tests.inst(''a''), gen_random_uuid())'), false, 'guardian_of_student is false while the tables are missing');
select is(pg_temp.as_user('a', 'student', 'private.is_student_self(tests.inst(''a''), gen_random_uuid())'), false, 'is_student_self is false while students is missing');
select is(pg_temp.as_user('platform', 'platform_owner', 'private.impersonating(tests.inst(''a''))'), false, 'impersonating is false while impersonation_sessions is missing');

-- Once the tables exist (minimal stand-ins with the columns the spec names) the helpers work.
create table public.teacher_assignments (id uuid primary key default gen_random_uuid(), institution_id uuid not null, membership_id uuid not null, section_id uuid not null, subject_id uuid);
create table public.students (id uuid primary key default gen_random_uuid(), institution_id uuid not null, profile_id uuid, deleted_at timestamptz);
create table public.guardians (id uuid primary key default gen_random_uuid(), institution_id uuid not null, profile_id uuid, deleted_at timestamptz);
create table public.student_guardians (institution_id uuid not null, student_id uuid not null, guardian_id uuid not null);

insert into public.teacher_assignments (institution_id, membership_id, section_id, subject_id)
select m.institution_id, m.id, '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1'
from public.memberships m where m.profile_id = tests.user_id('a', 'teacher') and m.institution_id = tests.inst('a');
insert into public.teacher_assignments (institution_id, membership_id, section_id, subject_id)
select m.institution_id, m.id, '00000000-0000-0000-0000-0000000000a2', null
from public.memberships m where m.profile_id = tests.user_id('a', 'teacher') and m.institution_id = tests.inst('a');

select is(pg_temp.as_user('a', 'teacher', 'private.is_teacher_of_section(tests.inst(''a''), ''00000000-0000-0000-0000-0000000000a1'')'), true, 'teacher is assigned to section a1');
select is(pg_temp.as_user('a', 'teacher', 'private.is_teacher_of_section(tests.inst(''a''), ''00000000-0000-0000-0000-0000000000a2'')'), true, 'a class-teacher row (null subject) also counts for the section');
select is(pg_temp.as_user('a', 'teacher', 'private.is_teacher_of_section(tests.inst(''a''), ''00000000-0000-0000-0000-0000000000a3'')'), false, 'teacher is not assigned to another section');
select is(pg_temp.as_user('a', 'teacher', 'private.is_teacher_of_section(tests.inst(''b''), ''00000000-0000-0000-0000-0000000000a1'')'), false, 'the same section id under another institution does not count');
select is(pg_temp.as_user('a', 'accountant', 'private.is_teacher_of_section(tests.inst(''a''), ''00000000-0000-0000-0000-0000000000a1'')'), false, 'only teachers count');
select is(pg_temp.as_user('a', 'teacher', 'private.teaches(tests.inst(''a''), ''00000000-0000-0000-0000-0000000000a1'', ''00000000-0000-0000-0000-0000000000b1'')'), true, 'teacher teaches subject b1 in a1');
select is(pg_temp.as_user('a', 'teacher', 'private.teaches(tests.inst(''a''), ''00000000-0000-0000-0000-0000000000a1'', ''00000000-0000-0000-0000-0000000000b2'')'), false, 'teacher does not teach another subject');
select is(pg_temp.as_user('a', 'teacher', 'private.teaches(tests.inst(''a''), ''00000000-0000-0000-0000-0000000000a2'', ''00000000-0000-0000-0000-0000000000b1'')'), false, 'a class-teacher row does not mean teaching a subject');

do $$
declare
  st uuid := gen_random_uuid();
  gd uuid := gen_random_uuid();
begin
  insert into public.students (id, institution_id, profile_id) values (st, tests.inst('a'), tests.user_id('a', 'student'));
  insert into public.guardians (id, institution_id, profile_id) values (gd, tests.inst('a'), tests.user_id('a', 'guardian'));
  insert into public.student_guardians (institution_id, student_id, guardian_id) values (tests.inst('a'), st, gd);
  perform set_config('tests.student', st::text, true);
end $$;

-- the guardian membership was set to invited above: no access until it is active again
select is(pg_temp.as_user('a', 'guardian', format('private.guardian_of_student(tests.inst(''a''), %L)', current_setting('tests.student'))), false, 'an invited guardian is not yet a guardian of the student');
update public.memberships set status = 'active' where institution_id = tests.inst('a') and profile_id = tests.user_id('a', 'guardian');
select is(pg_temp.as_user('a', 'guardian', format('private.guardian_of_student(tests.inst(''a''), %L)', current_setting('tests.student'))), true, 'an active guardian is a guardian of the linked student');
select is(pg_temp.as_user('a', 'student', format('private.is_student_self(tests.inst(''a''), %L)', current_setting('tests.student'))), true, 'the student is themselves');

select * from finish();
rollback;
