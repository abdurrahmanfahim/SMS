-- M1-A1: constraints of the academic structure tables (docs/spec/domain-model.md section 3):
-- overlap, one current year, duplicate names, composite tenant foreign keys, blocked deletes,
-- teacher assignment rules. Runs as the owner role (RLS is covered in 020).
begin;

select plan(39);

select tests.create_fixture();

-- ids used below (fixed so the statements stay readable)
create function pg_temp.mid(p_which text, p_role text) returns uuid language sql as $$
  select m.id from public.memberships m where m.institution_id = tests.inst(p_which) and m.profile_id = tests.user_id(p_which, p_role)
$$;

insert into public.academic_years (id, institution_id, name_bn, name_en, starts_on, ends_on, is_current) values
  ('00000000-0000-0000-0000-00000000a001', tests.inst('a'), '২০২৬', '2026', '2026-01-01', '2026-12-31', true),
  ('00000000-0000-0000-0000-00000000b001', tests.inst('b'), '২০২৬', '2026', '2026-01-01', '2026-12-31', true);

-- academic_years ------------------------------------------------------------------------
select throws_ok($$insert into public.academic_years (institution_id, name_en, starts_on, ends_on) values (tests.inst('a'), 'Overlap', '2026-12-31', '2027-06-30')$$, '23P01', null, 'a year sharing its first day with another year is rejected');
select throws_ok($$insert into public.academic_years (institution_id, name_en, starts_on, ends_on) values (tests.inst('a'), 'Inside', '2026-03-01', '2026-04-01')$$, '23P01', null, 'a year inside another year is rejected');
select lives_ok($$insert into public.academic_years (institution_id, name_en, starts_on, ends_on) values (tests.inst('a'), '2027', '2027-01-01', '2027-12-31')$$, 'the next year, directly after, is accepted');
select is((select count(*)::int from public.academic_years where starts_on = '2026-01-01' and ends_on = '2026-12-31' and name_en = '2026'), 2, 'two institutions may use the same dates and names');
select throws_ok($$insert into public.academic_years (institution_id, name_en, starts_on, ends_on) values (tests.inst('a'), 'Reversed', '2030-06-01', '2030-01-01')$$, '23514', null, 'ends_on must be after starts_on');
select throws_ok($$insert into public.academic_years (institution_id, starts_on, ends_on) values (tests.inst('a'), '2031-01-01', '2031-12-31')$$, '23514', null, 'a year needs a name in at least one language');
select throws_ok($$insert into public.academic_years (institution_id, name_en, starts_on, ends_on) values (tests.inst('a'), ' 2026 ', '2032-01-01', '2032-12-31')$$, '23505', null, 'a duplicate English name is rejected (case and outer spaces ignored)');
select throws_ok($$insert into public.academic_years (institution_id, name_bn, starts_on, ends_on) values (tests.inst('a'), '২০২৬', '2033-01-01', '2033-12-31')$$, '23505', null, 'a duplicate Bangla name is rejected');
select throws_ok($$insert into public.academic_years (institution_id, name_en, starts_on, ends_on, calendar) values (tests.inst('a'), 'Odd', '2034-01-01', '2034-12-31', 'lunar')$$, '23514', null, 'calendar is gregorian or hijri');
select throws_ok($$insert into public.academic_years (institution_id, name_en, starts_on, ends_on, is_current) values (tests.inst('a'), 'Second current', '2035-01-01', '2035-12-31', true)$$, '23505', null, 'only one current year per institution');

-- set_current_academic_year switches in one step (owner role: runs without a policy check)
select lives_ok($$select public.set_current_academic_year((select id from public.academic_years where institution_id = tests.inst('a') and name_en = '2027'))$$, 'set_current_academic_year switches the current year');
select is((select name_en from public.academic_years where institution_id = tests.inst('a') and is_current), '2027', 'exactly the new year is current');
select is((select count(*)::int from public.academic_years where institution_id = tests.inst('b') and is_current), 1, 'the other institution keeps its current year');
select throws_ok($$select public.set_current_academic_year(gen_random_uuid())$$, 'P0002', 'academic year not found or not allowed', 'an unknown year is rejected');

-- class_levels and subjects -------------------------------------------------------------
insert into public.class_levels (id, institution_id, name_bn, name_en, sort_order) values
  ('00000000-0000-0000-0000-00000000a101', tests.inst('a'), 'প্রথম শ্রেণি', 'Class 1', 1),
  ('00000000-0000-0000-0000-00000000b101', tests.inst('b'), 'প্রথম শ্রেণি', 'Class 1', 1);
insert into public.subjects (id, institution_id, name_bn, name_en, code) values
  ('00000000-0000-0000-0000-00000000a201', tests.inst('a'), 'বাংলা', 'Bangla', 'BAN'),
  ('00000000-0000-0000-0000-00000000b201', tests.inst('b'), 'বাংলা', 'Bangla', 'BAN');

select throws_ok($$insert into public.class_levels (institution_id, name_bn) values (tests.inst('a'), 'প্রথম শ্রেণি')$$, '23505', null, 'a duplicate class level name is rejected');
select throws_ok($$insert into public.class_levels (institution_id, name_en) values (tests.inst('a'), 'class 1')$$, '23505', null, 'a duplicate English class level name is rejected (case ignored)');
select throws_ok($$insert into public.class_levels (institution_id, name_en, category) values (tests.inst('a'), 'Class 2', 'university')$$, '23514', null, 'category must be one of the listed values');
select lives_ok($$insert into public.class_levels (institution_id, name_en, category) values (tests.inst('a'), 'Class 2', 'school')$$, 'a valid class level is accepted');
select throws_ok($$insert into public.subjects (institution_id, name_en) values (tests.inst('a'), 'bangla')$$, '23505', null, 'a duplicate subject name is rejected');
select throws_ok($$insert into public.subjects (institution_id, name_en, code) values (tests.inst('a'), 'Other', ' ban ')$$, '23505', null, 'a duplicate subject code is rejected');

-- sections ------------------------------------------------------------------------------
insert into public.sections (id, institution_id, academic_year_id, class_level_id, name) values
  ('00000000-0000-0000-0000-00000000a301', tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', 'A');

select throws_ok($$insert into public.sections (institution_id, academic_year_id, class_level_id, name) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', 'A')$$, '23505', null, 'a duplicate section name in the same year and level is rejected');
select throws_ok($$insert into public.sections (institution_id, academic_year_id, class_level_id, name) values (tests.inst('a'), '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a101', 'Z')$$, '23503', null, 'a section cannot use another institution''s year (composite tenant key)');
select throws_ok($$insert into public.sections (institution_id, academic_year_id, class_level_id, name) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000b101', 'Z')$$, '23503', null, 'a section cannot use another institution''s class level (composite tenant key)');
select throws_ok($$insert into public.sections (institution_id, academic_year_id, class_level_id, name, capacity) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', 'C', 0)$$, '23514', null, 'capacity must be positive');

-- class_subjects ------------------------------------------------------------------------
insert into public.class_subjects (institution_id, academic_year_id, class_level_id, subject_id)
values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', '00000000-0000-0000-0000-00000000a201');
select throws_ok($$insert into public.class_subjects (institution_id, academic_year_id, class_level_id, subject_id) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', '00000000-0000-0000-0000-00000000a201')$$, '23505', null, 'the same subject cannot be mapped twice to a level in a year');
select throws_ok($$insert into public.class_subjects (institution_id, academic_year_id, class_level_id, subject_id) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', '00000000-0000-0000-0000-00000000b201')$$, '23503', null, 'a class subject cannot use another institution''s subject (composite tenant key)');

-- teacher_assignments -------------------------------------------------------------------
select throws_ok(format($$insert into public.teacher_assignments (institution_id, academic_year_id, membership_id, section_id, subject_id, role) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', %L, '00000000-0000-0000-0000-00000000a301', '00000000-0000-0000-0000-00000000a201', 'subject_teacher')$$, pg_temp.mid('a', 'accountant')), '23514', 'only a teacher can be assigned to a section', 'a non-teacher membership cannot be assigned');
select throws_ok(format($$insert into public.teacher_assignments (institution_id, academic_year_id, membership_id, section_id, subject_id, role) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', %L, '00000000-0000-0000-0000-00000000a301', null, 'subject_teacher')$$, pg_temp.mid('a', 'teacher')), '23514', null, 'a subject teacher needs a subject');
select throws_ok(format($$insert into public.teacher_assignments (institution_id, academic_year_id, membership_id, section_id, subject_id, role) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', %L, '00000000-0000-0000-0000-00000000a301', '00000000-0000-0000-0000-00000000a201', 'class_teacher')$$, pg_temp.mid('a', 'teacher')), '23514', null, 'a class teacher has no subject');
select throws_ok(format($$insert into public.teacher_assignments (institution_id, academic_year_id, membership_id, section_id, subject_id, role) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', %L, '00000000-0000-0000-0000-00000000a301', '00000000-0000-0000-0000-00000000a201', 'subject_teacher')$$, pg_temp.mid('b', 'teacher')), '23503', 'membership does not belong to this institution', 'a teacher of another institution cannot be assigned (composite tenant key)');
select throws_ok(format($$insert into public.teacher_assignments (institution_id, academic_year_id, membership_id, section_id, subject_id, role) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', %L, '00000000-0000-0000-0000-00000000a301', '00000000-0000-0000-0000-00000000b201', 'subject_teacher')$$, pg_temp.mid('a', 'teacher')), '23503', null, 'a subject of another institution cannot be used (composite tenant key)');

insert into public.teacher_assignments (id, institution_id, academic_year_id, membership_id, section_id, subject_id, role)
values ('00000000-0000-0000-0000-00000000a401', tests.inst('a'), '00000000-0000-0000-0000-00000000a001', pg_temp.mid('a', 'teacher'), '00000000-0000-0000-0000-00000000a301', null, 'class_teacher');
select is((select class_teacher_membership_id from public.sections where id = '00000000-0000-0000-0000-00000000a301'), pg_temp.mid('a', 'teacher'), 'a class teacher assignment is mirrored on the section');
select throws_ok(format($$insert into public.teacher_assignments (institution_id, academic_year_id, membership_id, section_id, subject_id, role) values (tests.inst('a'), '00000000-0000-0000-0000-00000000a001', %L, '00000000-0000-0000-0000-00000000a301', null, 'class_teacher')$$, pg_temp.mid('a', 'teacher')), '23505', null, 'a section has only one class teacher');

-- deleting something with dependants is blocked ------------------------------------------
select throws_ok($$delete from public.class_levels where id = '00000000-0000-0000-0000-00000000a101'$$, '23503', null, 'a class level with sections cannot be deleted');
select throws_ok($$delete from public.sections where id = '00000000-0000-0000-0000-00000000a301'$$, '23503', null, 'a section with assignments cannot be deleted');
select throws_ok($$delete from public.subjects where id = '00000000-0000-0000-0000-00000000a201'$$, '23503', null, 'a subject mapped to a class level cannot be deleted');
select throws_ok($$delete from public.academic_years where id = '00000000-0000-0000-0000-00000000a001'$$, '23503', null, 'a year with sections cannot be deleted');

delete from public.teacher_assignments where id = '00000000-0000-0000-0000-00000000a401';
select is((select class_teacher_membership_id from public.sections where id = '00000000-0000-0000-0000-00000000a301'), null, 'removing the class teacher assignment clears the section');
select throws_ok($$update public.sections set institution_id = tests.inst('b') where id = '00000000-0000-0000-0000-00000000a301'$$, '23514', 'institution_id is immutable', 'institution_id cannot change');

select * from finish();
rollback;
