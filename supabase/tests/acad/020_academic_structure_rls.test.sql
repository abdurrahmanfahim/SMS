-- M1-A1: row level security and audit for the academic structure tables. For every table: the
-- allowed role passes, other roles fail, another tenant fails, anon fails (permissions.md section 2).
-- Bootstrap: `supabase test db` runs every file in plain sorted order, and `acad/` sorts BEFORE
-- `helpers.sql`, so the `tests` schema may not exist yet when this file starts. Install it first
-- (the file is idempotent) with its TAP output hidden, so this file's own plan stays correct.
\o /dev/null
\ir ../helpers.sql
\o
begin;

select plan(63);

select tests.create_fixture();

create function pg_temp.a_teacher_mid() returns uuid language sql as $$
  select m.id from public.memberships m where m.institution_id = tests.inst('a') and m.profile_id = tests.user_id('a', 'teacher')
$$;

insert into public.academic_years (id, institution_id, name_en, starts_on, ends_on, is_current) values
  ('00000000-0000-0000-0000-00000000a001', tests.inst('a'), '2026', '2026-01-01', '2026-12-31', true),
  ('00000000-0000-0000-0000-00000000b001', tests.inst('b'), '2026', '2026-01-01', '2026-12-31', true);
insert into public.class_levels (id, institution_id, name_en, sort_order) values
  ('00000000-0000-0000-0000-00000000a101', tests.inst('a'), 'Class 1', 1),
  ('00000000-0000-0000-0000-00000000b101', tests.inst('b'), 'Class 1', 1);
insert into public.subjects (id, institution_id, name_en) values
  ('00000000-0000-0000-0000-00000000a201', tests.inst('a'), 'Bangla'),
  ('00000000-0000-0000-0000-00000000b201', tests.inst('b'), 'Bangla');
insert into public.sections (id, institution_id, academic_year_id, class_level_id, name) values
  ('00000000-0000-0000-0000-00000000a301', tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', 'A'),
  ('00000000-0000-0000-0000-00000000b301', tests.inst('b'), '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000b101', 'A');
insert into public.class_subjects (id, institution_id, academic_year_id, class_level_id, subject_id) values
  ('00000000-0000-0000-0000-00000000a501', tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', '00000000-0000-0000-0000-00000000a201'),
  ('00000000-0000-0000-0000-00000000b501', tests.inst('b'), '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000b101', '00000000-0000-0000-0000-00000000b201');
insert into public.teacher_assignments (id, institution_id, academic_year_id, membership_id, section_id, subject_id, role)
select '00000000-0000-0000-0000-00000000a401', m.institution_id, '00000000-0000-0000-0000-00000000a001', m.id, '00000000-0000-0000-0000-00000000a301', '00000000-0000-0000-0000-00000000a201', 'subject_teacher'
from public.memberships m where m.institution_id = tests.inst('a') and m.profile_id = tests.user_id('a', 'teacher');
insert into public.teacher_assignments (id, institution_id, academic_year_id, membership_id, section_id, subject_id, role)
select '00000000-0000-0000-0000-00000000b401', m.institution_id, '00000000-0000-0000-0000-00000000b001', m.id, '00000000-0000-0000-0000-00000000b301', '00000000-0000-0000-0000-00000000b201', 'subject_teacher'
from public.memberships m where m.institution_id = tests.inst('b') and m.profile_id = tests.user_id('b', 'teacher');

-- Read: five tables readable by admin, teacher, accountant, student; not guardian, outsider, other tenant, platform.
select is(tests.count_as('a', 'institution_admin', 'select 1 from public.academic_years'), 1::bigint, 'admin A reads only their years');
select is(tests.count_as('a', 'teacher', 'select 1 from public.academic_years'), 1::bigint, 'teacher A reads years');
select is(tests.count_as('a', 'accountant', 'select 1 from public.academic_years'), 1::bigint, 'accountant A reads years');
select is(tests.count_as('a', 'student', 'select 1 from public.academic_years'), 1::bigint, 'student A reads years');
select is(tests.count_as('a', 'guardian', 'select 1 from public.academic_years'), 0::bigint, 'guardian A reads no years (own-children scope arrives with M1-A2)');
select is(tests.count_as('none', 'outsider', 'select 1 from public.academic_years'), 0::bigint, 'a user with no membership reads no years');
select is(tests.count_as('platform', 'platform_owner', 'select 1 from public.academic_years'), 0::bigint, 'a platform owner reads no years without an impersonation session');
select is(tests.count_as('b', 'institution_admin', format('select 1 from public.academic_years where institution_id = %L', tests.inst('a'))), 0::bigint, 'admin B cannot read institution A years (other tenant)');

select is(tests.count_as('a', 'institution_admin', 'select 1 from public.class_levels'), 1::bigint, 'admin A reads their class levels');
select is(tests.count_as('a', 'teacher', 'select 1 from public.class_levels'), 1::bigint, 'teacher A reads class levels');
select is(tests.count_as('a', 'accountant', 'select 1 from public.class_levels'), 1::bigint, 'accountant A reads class levels');
select is(tests.count_as('a', 'student', 'select 1 from public.class_levels'), 1::bigint, 'student A reads class levels');
select is(tests.count_as('a', 'guardian', 'select 1 from public.class_levels'), 0::bigint, 'guardian A reads no class levels');
select is(tests.count_as('b', 'teacher', format('select 1 from public.class_levels where institution_id = %L', tests.inst('a'))), 0::bigint, 'teacher B cannot read institution A class levels (other tenant)');

select is(tests.count_as('a', 'teacher', 'select 1 from public.sections'), 1::bigint, 'teacher A reads sections');
select is(tests.count_as('a', 'accountant', 'select 1 from public.sections'), 1::bigint, 'accountant A reads sections');
select is(tests.count_as('a', 'student', 'select 1 from public.sections'), 1::bigint, 'student A reads sections');
select is(tests.count_as('a', 'guardian', 'select 1 from public.sections'), 0::bigint, 'guardian A reads no sections');
select is(tests.count_as('b', 'institution_admin', format('select 1 from public.sections where institution_id = %L', tests.inst('a'))), 0::bigint, 'admin B cannot read institution A sections (other tenant)');

select is(tests.count_as('a', 'teacher', 'select 1 from public.subjects'), 1::bigint, 'teacher A reads subjects');
select is(tests.count_as('a', 'student', 'select 1 from public.subjects'), 1::bigint, 'student A reads subjects');
select is(tests.count_as('a', 'guardian', 'select 1 from public.subjects'), 0::bigint, 'guardian A reads no subjects');
select is(tests.count_as('b', 'accountant', format('select 1 from public.subjects where institution_id = %L', tests.inst('a'))), 0::bigint, 'accountant B cannot read institution A subjects (other tenant)');

select is(tests.count_as('a', 'teacher', 'select 1 from public.class_subjects'), 1::bigint, 'teacher A reads class subjects');
select is(tests.count_as('a', 'student', 'select 1 from public.class_subjects'), 1::bigint, 'student A reads class subjects');
select is(tests.count_as('a', 'guardian', 'select 1 from public.class_subjects'), 0::bigint, 'guardian A reads no class subjects');
select is(tests.count_as('b', 'institution_admin', format('select 1 from public.class_subjects where institution_id = %L', tests.inst('a'))), 0::bigint, 'admin B cannot read institution A class subjects (other tenant)');

select is(tests.count_as('a', 'institution_admin', 'select 1 from public.teacher_assignments'), 1::bigint, 'admin A reads teacher assignments');
select is(tests.count_as('a', 'teacher', 'select 1 from public.teacher_assignments'), 1::bigint, 'teacher A reads teacher assignments');
select is(tests.count_as('a', 'accountant', 'select 1 from public.teacher_assignments'), 1::bigint, 'accountant A reads teacher assignments');
select is(tests.count_as('a', 'student', 'select 1 from public.teacher_assignments'), 0::bigint, 'student A does not read teacher assignments');
select is(tests.count_as('a', 'guardian', 'select 1 from public.teacher_assignments'), 0::bigint, 'guardian A does not read teacher assignments');
select is(tests.count_as('b', 'teacher', format('select 1 from public.teacher_assignments where institution_id = %L', tests.inst('a'))), 0::bigint, 'teacher B cannot read institution A teacher assignments (other tenant)');

-- anon has no privilege at all
select tests.act_as_anon();
select throws_ok($$select * from public.academic_years$$, '42501', null, 'anon cannot read years');
select throws_ok($$select * from public.class_levels$$, '42501', null, 'anon cannot read class levels');
select throws_ok($$select * from public.sections$$, '42501', null, 'anon cannot read sections');
select throws_ok($$select * from public.subjects$$, '42501', null, 'anon cannot read subjects');
select throws_ok($$select * from public.class_subjects$$, '42501', null, 'anon cannot read class subjects');
select throws_ok($$select * from public.teacher_assignments$$, '42501', null, 'anon cannot read teacher assignments');
select tests.reset();

-- Write: institution admin only. Other roles are refused (RLS error on insert; update/delete touch 0 rows).
select tests.act_as('a', 'institution_admin');
insert into public.class_levels (id, institution_id, name_en, sort_order) values ('00000000-0000-0000-0000-00000000a102', tests.inst('a'), 'Class 2', 2);
insert into public.subjects (id, institution_id, name_en) values ('00000000-0000-0000-0000-00000000a202', tests.inst('a'), 'English');
insert into public.academic_years (id, institution_id, name_en, starts_on, ends_on) values ('00000000-0000-0000-0000-00000000a002', tests.inst('a'), '2027', '2027-01-01', '2027-12-31');
insert into public.sections (id, institution_id, academic_year_id, class_level_id, name) values ('00000000-0000-0000-0000-00000000a302', tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a102', 'A');
insert into public.class_subjects (id, institution_id, academic_year_id, class_level_id, subject_id) values ('00000000-0000-0000-0000-00000000a502', tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a102', '00000000-0000-0000-0000-00000000a202');
select tests.reset();
select is((select count(*)::int from public.class_levels where id = '00000000-0000-0000-0000-00000000a102'), 1, 'admin A can create a class level');
select is((select count(*)::int from public.subjects where id = '00000000-0000-0000-0000-00000000a202'), 1, 'admin A can create a subject');
select is((select count(*)::int from public.academic_years where id = '00000000-0000-0000-0000-00000000a002'), 1, 'admin A can create a year');
select is((select count(*)::int from public.sections where id = '00000000-0000-0000-0000-00000000a302'), 1, 'admin A can create a section');
select is((select count(*)::int from public.class_subjects where id = '00000000-0000-0000-0000-00000000a502'), 1, 'admin A can map a subject to a class level');

select tests.act_as('a', 'teacher');
select throws_ok($$insert into public.class_levels (institution_id, name_en) values (tests.inst('a'), 'Class 9')$$, '42501', null, 'teacher A cannot create a class level');
select throws_ok($$insert into public.subjects (institution_id, name_en) values (tests.inst('a'), 'Art')$$, '42501', null, 'teacher A cannot create a subject');
select throws_ok($$insert into public.academic_years (institution_id, name_en, starts_on, ends_on) values (tests.inst('a'), '2040', '2040-01-01', '2040-12-31')$$, '42501', null, 'teacher A cannot create a year');
select throws_ok(format($$insert into public.teacher_assignments (institution_id, academic_year_id, membership_id, section_id, subject_id, role) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', %L, '00000000-0000-0000-0000-00000000a302', '00000000-0000-0000-0000-00000000a201', 'subject_teacher')$$, pg_temp.a_teacher_mid()), '42501', null, 'teacher A cannot create a teacher assignment, not even for themselves');
select tests.reset();
select tests.act_as('a', 'accountant');
select throws_ok($$insert into public.class_levels (institution_id, name_en) values (tests.inst('a'), 'Class 9')$$, '42501', null, 'accountant A cannot create a class level');
select tests.reset();
select tests.act_as('a', 'student');
select throws_ok($$insert into public.subjects (institution_id, name_en) values (tests.inst('a'), 'Art')$$, '42501', null, 'student A cannot create a subject');
select tests.reset();

-- another tenant: admin B cannot insert into A, update A, or delete A
select tests.act_as('b', 'institution_admin');
select throws_ok($$insert into public.class_levels (institution_id, name_en) values (tests.inst('a'), 'Intruder')$$, '42501', null, 'admin B cannot create a class level in institution A (other tenant)');
select throws_ok(format($$insert into public.teacher_assignments (institution_id, academic_year_id, membership_id, section_id, subject_id, role) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', %L, '00000000-0000-0000-0000-00000000a301', '00000000-0000-0000-0000-00000000a201', 'subject_teacher')$$, pg_temp.a_teacher_mid()), '23503', null, 'admin B cannot create a teacher assignment in institution A (other tenant: the membership is not visible to B)');
update public.class_levels set name_en = 'Hacked' where id = '00000000-0000-0000-0000-00000000a101';
delete from public.subjects where id = '00000000-0000-0000-0000-00000000a201';
select tests.reset();
select is((select name_en from public.class_levels where id = '00000000-0000-0000-0000-00000000a101'), 'Class 1', 'admin B cannot update an institution A class level (other tenant)');
select is((select count(*)::int from public.subjects where id = '00000000-0000-0000-0000-00000000a201'), 1, 'admin B cannot delete an institution A subject (other tenant)');

-- teacher cannot update or delete either (0 rows touched)
select tests.act_as('a', 'teacher');
update public.sections set name = 'Z' where id = '00000000-0000-0000-0000-00000000a301';
delete from public.teacher_assignments where id = '00000000-0000-0000-0000-00000000a401';
select tests.reset();
select is((select name from public.sections where id = '00000000-0000-0000-0000-00000000a301'), 'A', 'teacher A cannot update a section');
select is((select count(*)::int from public.teacher_assignments where id = '00000000-0000-0000-0000-00000000a401'), 1, 'teacher A cannot delete a teacher assignment');

-- set_current_academic_year: admin A can switch, teacher cannot
select tests.act_as('a', 'teacher');
select throws_ok($$select public.set_current_academic_year('00000000-0000-0000-0000-00000000a002')$$, 'P0002', 'academic year not found or not allowed', 'a teacher cannot change the current year (the call is refused)');
select tests.reset();
select is((select id from public.academic_years where institution_id = tests.inst('a') and is_current), '00000000-0000-0000-0000-00000000a001'::uuid, 'a teacher cannot change the current year');
select tests.act_as('a', 'institution_admin');
select public.set_current_academic_year('00000000-0000-0000-0000-00000000a002');
select tests.reset();
select is((select id from public.academic_years where institution_id = tests.inst('a') and is_current), '00000000-0000-0000-0000-00000000a002'::uuid, 'admin A can change the current year');
select tests.act_as('b', 'institution_admin');
select throws_ok($$select public.set_current_academic_year('00000000-0000-0000-0000-00000000a001')$$, 'P0002', null, 'admin B cannot see an institution A year, so it cannot become current');
select tests.reset();
select tests.act_as_anon();
select throws_ok($$select public.set_current_academic_year('00000000-0000-0000-0000-00000000a001')$$, '42501', null, 'anon cannot call set_current_academic_year');
select tests.reset();

-- Audit: changes by an admin write rows with the actor
select is((select count(*)::int from public.audit_log where entity_type = 'class_levels' and entity_id = '00000000-0000-0000-0000-00000000a102' and action = 'insert' and actor_role = 'institution_admin' and institution_id = tests.inst('a')), 1, 'creating a class level wrote an audit row');
select is((select count(*)::int from public.audit_log where entity_type = 'academic_years' and action = 'update' and institution_id = tests.inst('a') and (after ->> 'is_current') = 'true'), 1, 'making a year current wrote an audit row');

select * from finish();
rollback;
