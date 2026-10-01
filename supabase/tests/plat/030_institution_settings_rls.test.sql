-- M1-P1 step 7: institution_settings. Allowed role passes, other role fails, other tenant fails.
begin;

select plan(32);

select tests.create_fixture();

-- Defaults and constraints (as the owner role) ----------------------------------------
select is((select count(*)::int from public.institution_settings), 2, 'every institution got a settings row');
select row_eq(
  $$select academic_year_style, weekly_holidays, use_bangla_digits, attendance_edit_window_days, letterhead
    from public.institution_settings where institution_id = tests.inst('a')$$,
  row('gregorian'::text, '{5}'::smallint[], true, 2::smallint, '{}'::jsonb),
  'defaults match the spec'
);
select throws_ok($$update public.institution_settings set academic_year_style = 'lunar' where institution_id = tests.inst('a')$$, '23514', null, 'academic_year_style is restricted');
select throws_ok($$update public.institution_settings set weekly_holidays = '{8}' where institution_id = tests.inst('a')$$, '23514', null, 'weekly_holidays must be ISO weekdays 1 to 7');
select lives_ok($$update public.institution_settings set weekly_holidays = '{5,6}' where institution_id = tests.inst('a')$$, 'two weekly holidays are fine');
select throws_ok($$update public.institution_settings set attendance_edit_window_days = 31 where institution_id = tests.inst('a')$$, '23514', null, 'edit window is capped');
select throws_ok($$update public.institution_settings set attendance_edit_window_days = -1 where institution_id = tests.inst('a')$$, '23514', null, 'edit window cannot be negative');
select throws_ok($$update public.institution_settings set letterhead = '[]' where institution_id = tests.inst('a')$$, '23514', null, 'letterhead must be a JSON object');
select throws_ok($$update public.institution_settings set institution_id = tests.inst('b') where institution_id = tests.inst('a')$$, '23514', 'institution_id is immutable', 'institution_id cannot change');
select lives_ok($$update public.institution_settings set weekly_holidays = '{5}' where institution_id = tests.inst('a')$$, 'reset holidays');

-- Read: admin, teacher and accountant of the institution -------------------------------
select is(tests.count_as('a', 'institution_admin', 'select 1 from public.institution_settings'), 1::bigint, 'admin A reads exactly their own settings row');
select is(tests.count_as('a', 'teacher', 'select 1 from public.institution_settings'), 1::bigint, 'teacher A reads their settings');
select is(tests.count_as('a', 'accountant', 'select 1 from public.institution_settings'), 1::bigint, 'accountant A reads their settings');
select is(tests.count_as('a', 'guardian', 'select 1 from public.institution_settings'), 0::bigint, 'guardian A cannot read settings');
select is(tests.count_as('a', 'student', 'select 1 from public.institution_settings'), 0::bigint, 'student A cannot read settings');
select is(tests.count_as('none', 'outsider', 'select 1 from public.institution_settings'), 0::bigint, 'a user with no membership reads nothing');
select is(tests.count_as('platform', 'platform_owner', 'select 1 from public.institution_settings'), 0::bigint, 'a platform owner reads nothing without an impersonation session');
select is(tests.count_as('b', 'institution_admin', format('select 1 from public.institution_settings where institution_id = %L', tests.inst('a'))), 0::bigint, 'admin B cannot read institution A settings (other tenant)');
select is(tests.count_as('b', 'teacher', format('select 1 from public.institution_settings where institution_id = %L', tests.inst('a'))), 0::bigint, 'teacher B cannot read institution A settings (other tenant)');

select tests.act_as_anon();
select throws_ok($$select * from public.institution_settings$$, '42501', null, 'anon cannot read settings');
select tests.reset();

-- Update: institution admin only ------------------------------------------------------
select tests.act_as('a', 'institution_admin');
update public.institution_settings set use_bangla_digits = false where institution_id = tests.inst('a');
select tests.reset();
select is((select use_bangla_digits from public.institution_settings where institution_id = tests.inst('a')), false, 'admin A can update their settings');

select tests.act_as('a', 'institution_admin');
update public.institution_settings set use_bangla_digits = false where institution_id = tests.inst('b');
select tests.reset();
select is((select use_bangla_digits from public.institution_settings where institution_id = tests.inst('b')), true, 'admin A cannot update institution B settings (other tenant)');

select tests.act_as('a', 'institution_admin');
select throws_ok(format($$update public.institution_settings set institution_id = %L where institution_id = %L$$, tests.inst('b'), tests.inst('a')), null, null, 'admin A cannot move their settings row to institution B');
select tests.reset();

select tests.act_as('a', 'teacher');
update public.institution_settings set use_bangla_digits = false, attendance_edit_window_days = 9 where institution_id = tests.inst('a') and false;
update public.institution_settings set attendance_edit_window_days = 9 where institution_id = tests.inst('a');
select tests.reset();
select is((select attendance_edit_window_days from public.institution_settings where institution_id = tests.inst('a')), 2::smallint, 'teacher A cannot update settings');

select tests.act_as('a', 'accountant');
update public.institution_settings set attendance_edit_window_days = 9 where institution_id = tests.inst('a');
select tests.reset();
select is((select attendance_edit_window_days from public.institution_settings where institution_id = tests.inst('a')), 2::smallint, 'accountant A cannot update settings');

select tests.act_as('a', 'guardian');
update public.institution_settings set attendance_edit_window_days = 9 where institution_id = tests.inst('a');
select tests.reset();
select is((select attendance_edit_window_days from public.institution_settings where institution_id = tests.inst('a')), 2::smallint, 'guardian A cannot update settings');

select tests.act_as('platform', 'platform_owner');
update public.institution_settings set attendance_edit_window_days = 9 where institution_id = tests.inst('a');
select tests.reset();
select is((select attendance_edit_window_days from public.institution_settings where institution_id = tests.inst('a')), 2::smallint, 'a platform owner cannot update settings without a write impersonation session');

select tests.act_as_anon();
select throws_ok($$update public.institution_settings set use_bangla_digits = false$$, '42501', null, 'anon cannot update settings');
select tests.reset();

-- No client insert or delete ---------------------------------------------------------
select tests.act_as('a', 'institution_admin');
select throws_ok(format($$insert into public.institution_settings (institution_id) values (%L)$$, gen_random_uuid()), '42501', null, 'admin cannot insert settings rows');
select throws_ok($$delete from public.institution_settings$$, '42501', null, 'admin cannot delete settings rows');
select tests.reset();

-- The audit trigger recorded the admin's change, with the right actor and role --------
select is(
  (select count(*)::int from public.audit_log
   where entity_type = 'institution_settings' and action = 'update'
     and institution_id = tests.inst('a') and actor_role = 'institution_admin'
     and actor_profile_id = tests.user_id('a', 'institution_admin')
     and (before ->> 'use_bangla_digits') = 'true' and (after ->> 'use_bangla_digits') = 'false'),
  1,
  'the admin settings update was audited with actor, role, before and after'
);

-- Deleting an institution removes its settings
delete from public.institutions where id = tests.inst('b');
select is((select count(*)::int from public.institution_settings where institution_id = tests.inst('b')), 0, 'settings are removed with their institution');

select * from finish();
rollback;
