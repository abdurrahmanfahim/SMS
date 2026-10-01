-- M1-P1 step 7: platform_admins, audit_log (append-only, readable by scope), the audit trigger on
-- memberships, and impersonation-aware auditing. Allowed role passes, other role fails,
-- other tenant fails.
begin;

select plan(50);

select tests.create_fixture();

-- ===== platform_admins ==========================================================
select is(tests.count_as('platform', 'platform_owner', 'select 1 from public.platform_admins'), 1::bigint, 'a platform owner reads their own row');
select is(tests.count_as('a', 'institution_admin', 'select 1 from public.platform_admins'), 0::bigint, 'institution admin A cannot read platform_admins');
select is(tests.count_as('a', 'teacher', 'select 1 from public.platform_admins'), 0::bigint, 'teacher A cannot read platform_admins');
select is(tests.count_as('b', 'institution_admin', 'select 1 from public.platform_admins'), 0::bigint, 'institution admin B cannot read platform_admins (other tenant)');
select is(tests.count_as('none', 'outsider', 'select 1 from public.platform_admins'), 0::bigint, 'a user with no membership cannot read platform_admins');

select tests.act_as('a', 'institution_admin');
select throws_ok(format($$insert into public.platform_admins (profile_id) values (%L)$$, tests.user_id('a', 'institution_admin')), '42501', null, 'an institution admin cannot make themselves a platform owner');
select tests.reset();
select tests.act_as('platform', 'platform_owner');
select throws_ok(format($$insert into public.platform_admins (profile_id) values (%L)$$, tests.user_id('a', 'teacher')), '42501', null, 'even a platform owner cannot insert through the API');
select throws_ok($$delete from public.platform_admins$$, '42501', null, 'a platform owner cannot delete through the API');
select throws_ok($$update public.platform_admins set created_by = null$$, '42501', null, 'a platform owner cannot update through the API');
select tests.reset();
select tests.act_as_anon();
select throws_ok($$select * from public.platform_admins$$, '42501', null, 'anon cannot read platform_admins');
select tests.reset();

-- ===== audit_log: read scope =====================================================
-- One row for each institution and one platform-level row, written by server code.
select tests.act_as_service();
insert into public.audit_log (institution_id, actor_role, action, entity_type)
values (tests.inst('a'), 'system', 'probe', 'probe_a'),
       (tests.inst('b'), 'system', 'probe', 'probe_b'),
       (null, 'system', 'probe', 'probe_platform');
select tests.reset();

select is(tests.count_as('platform', 'platform_owner', $$select 1 from public.audit_log where action = 'probe'$$), 3::bigint, 'a platform owner reads every audit row, including platform-level ones');
select is(tests.count_as('a', 'institution_admin', $$select 1 from public.audit_log where entity_type = 'probe_a'$$), 1::bigint, 'admin A reads their institution''s audit rows');
select is(tests.count_as('a', 'institution_admin', $$select 1 from public.audit_log where entity_type in ('probe_b', 'probe_platform')$$), 0::bigint, 'admin A cannot read institution B or platform-level audit rows (other tenant)');
select is(tests.count_as('b', 'institution_admin', $$select 1 from public.audit_log where entity_type = 'probe_a'$$), 0::bigint, 'admin B cannot read institution A audit rows (other tenant)');
select is(tests.count_as('a', 'teacher', 'select 1 from public.audit_log'), 0::bigint, 'teacher A cannot read the audit log');
select is(tests.count_as('a', 'accountant', 'select 1 from public.audit_log'), 0::bigint, 'accountant A cannot read the audit log');
select is(tests.count_as('a', 'guardian', 'select 1 from public.audit_log'), 0::bigint, 'guardian A cannot read the audit log');
select is(tests.count_as('a', 'student', 'select 1 from public.audit_log'), 0::bigint, 'student A cannot read the audit log');
select is(tests.count_as('none', 'outsider', 'select 1 from public.audit_log'), 0::bigint, 'a user with no membership cannot read the audit log');
select tests.act_as_anon();
select throws_ok($$select * from public.audit_log$$, '42501', null, 'anon cannot read the audit log');
select tests.reset();

-- ===== audit_log: append-only ======================================================
-- Nobody writes from a client.
select tests.act_as('a', 'institution_admin');
select throws_ok(format($$insert into public.audit_log (institution_id, actor_role, action, entity_type) values (%L, 'institution_admin', 'forged', 'x')$$, tests.inst('a')), '42501', null, 'an admin cannot insert audit rows');
select tests.reset();
select tests.act_as('platform', 'platform_owner');
select throws_ok($$insert into public.audit_log (actor_role, action, entity_type) values ('platform_owner', 'forged', 'x')$$, '42501', null, 'a platform owner cannot insert audit rows through the API');
select tests.reset();

-- Server code (service role) may insert, but never update, delete or truncate.
select tests.act_as_service();
select lives_ok($$insert into public.audit_log (actor_role, action, entity_type) values ('system', 'server-event', 'x')$$, 'the service role can append audit rows');
select throws_ok($$update public.audit_log set action = 'changed'$$, '42501', null, 'the service role cannot update audit rows');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'the service role cannot delete audit rows');
select throws_ok($$truncate public.audit_log$$, '42501', null, 'the service role cannot truncate the audit log');
select tests.reset();

-- The owner role (which owns the table and bypasses privileges) is stopped by the triggers.
select throws_ok($$update public.audit_log set action = 'changed'$$, '42501', 'audit_log is append-only: UPDATE is not allowed', 'the owner role cannot update audit rows');
select throws_ok($$delete from public.audit_log$$, '42501', 'audit_log is append-only: DELETE is not allowed', 'the owner role cannot delete audit rows');
select throws_ok($$truncate public.audit_log$$, '42501', 'audit_log is append-only: TRUNCATE is not allowed', 'the owner role cannot truncate the audit log');

-- ===== audit trigger on memberships ================================================
-- Server code (no signed-in user): actor is `system`.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000f001', 'extra@test.invalid');
insert into public.profiles (id, full_name) values ('00000000-0000-0000-0000-00000000f001', 'Extra person');
insert into public.memberships (id, institution_id, profile_id, role, status)
values ('00000000-0000-0000-0000-00000000e001', tests.inst('a'), '00000000-0000-0000-0000-00000000f001', 'teacher', 'invited');

select is(
  (select count(*)::int from public.audit_log where entity_type = 'memberships' and action = 'insert' and entity_id = '00000000-0000-0000-0000-00000000e001'
     and institution_id = tests.inst('a') and actor_role = 'system' and actor_profile_id is null
     and before is null and (after ->> 'role') = 'teacher' and (after ->> 'status') = 'invited'),
  1, 'inserting a membership writes an audit row (actor system, after image, no before image)'
);

-- A signed-in institution admin (claims kept, owner role, as an API server function would do).
select tests.act_as('a', 'institution_admin');
reset role;
update public.memberships set status = 'active' where id = '00000000-0000-0000-0000-00000000e001';
select is(
  (select count(*)::int from public.audit_log where entity_type = 'memberships' and action = 'update' and entity_id = '00000000-0000-0000-0000-00000000e001'
     and actor_role = 'institution_admin' and actor_profile_id = tests.user_id('a', 'institution_admin')
     and (before ->> 'status') = 'invited' and (after ->> 'status') = 'active'),
  1, 'updating a membership writes an audit row with before, after, actor and role'
);
delete from public.memberships where id = '00000000-0000-0000-0000-00000000e001';
select is(
  (select count(*)::int from public.audit_log where entity_type = 'memberships' and action = 'delete' and entity_id = '00000000-0000-0000-0000-00000000e001'
     and actor_role = 'institution_admin' and after is null and (before ->> 'status') = 'active'),
  1, 'deleting a membership writes an audit row (before image, no after image)'
);
select tests.reset();

select is(
  (select count(*)::int from public.audit_log where entity_type = 'memberships' and entity_id = '00000000-0000-0000-0000-00000000e001'),
  3, 'exactly one audit row per insert, update and delete'
);

-- A signed-in user with no role in the institution is recorded as system and flagged.
select tests.act_as('none', 'outsider');
reset role;
insert into public.memberships (id, institution_id, profile_id, role, status)
values ('00000000-0000-0000-0000-00000000e002', tests.inst('a'), '00000000-0000-0000-0000-00000000f001', 'student', 'invited');
select tests.reset();
select is(
  (select (meta ->> 'actor_role_unresolved') from public.audit_log where entity_id = '00000000-0000-0000-0000-00000000e002' and action = 'insert'),
  'true', 'an actor with no role in the institution is flagged as unresolved'
);

-- A platform owner outside an impersonation session is recorded as platform_owner.
select tests.act_as('platform', 'platform_owner');
reset role;
update public.memberships set status = 'active' where id = '00000000-0000-0000-0000-00000000e002';
select tests.reset();
select is(
  (select actor_role from public.audit_log where entity_id = '00000000-0000-0000-0000-00000000e002' and action = 'update'),
  'platform_owner', 'a platform owner is recorded as platform_owner'
);

-- Trigger arguments keep columns out of the images; the trigger refuses to be a BEFORE or statement trigger.
create table public.audit_probe (id uuid primary key default gen_random_uuid(), institution_id uuid, secret text, note text);
create trigger audit_row_change after insert or update or delete on public.audit_probe
  for each row execute function private.audit_row_change('secret');
insert into public.audit_probe (id, institution_id, secret, note)
values ('00000000-0000-0000-0000-00000000d001', tests.inst('a'), 'hunter2', 'visible');
select is(
  (select (after ? 'secret') from public.audit_log where entity_type = 'audit_probe'),
  false, 'a column named in the trigger arguments is left out of the audit images'
);
select is(
  (select after ->> 'note' from public.audit_log where entity_type = 'audit_probe'),
  'visible', 'other columns are kept'
);
create table public.audit_probe2 (id uuid primary key default gen_random_uuid());
create trigger audit_row_change before insert on public.audit_probe2
  for each row execute function private.audit_row_change();
select throws_like($$insert into public.audit_probe2 default values$$, '%must be an AFTER%', 'the audit trigger refuses to run as a BEFORE trigger');

-- ===== impersonation: stand-in for the M1-P3 table =============================
create table public.impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_admin_id uuid not null,
  institution_id uuid not null,
  write_access boolean not null default false,
  started_at timestamptz not null default now() - interval '1 minute',
  expires_at timestamptz not null default now() + interval '30 minutes',
  ended_at timestamptz
);
insert into public.impersonation_sessions (id, platform_admin_id, institution_id)
values ('00000000-0000-0000-0000-00000000c001', tests.user_id('platform', 'platform_owner'), tests.inst('a'));

select is(tests.count_as('platform', 'platform_owner', $$select 1 where private.has_role(tests.inst('a'), array['institution_admin'])$$), 1::bigint, 'a platform owner with an active session passes has_role for that institution');
select is(tests.count_as('platform', 'platform_owner', $$select 1 where private.has_role(tests.inst('b'), array['institution_admin'])$$), 0::bigint, 'the session does not extend to another institution');
select is(tests.count_as('platform', 'platform_owner', $$select 1 where private.has_role_write(tests.inst('a'), array['institution_admin'])$$), 0::bigint, 'a read-only session fails has_role_write');
update public.impersonation_sessions set write_access = true where id = '00000000-0000-0000-0000-00000000c001';
select is(tests.count_as('platform', 'platform_owner', $$select 1 where private.has_role_write(tests.inst('a'), array['institution_admin'])$$), 1::bigint, 'a write session passes has_role_write');
select is(tests.count_as('a', 'institution_admin', $$select 1 where private.impersonating(tests.inst('a'))$$), 0::bigint, 'only the session''s platform owner counts as impersonating');

-- Under a session the platform owner reads the institution's audit rows through has_role and the log says so.
select tests.act_as('platform', 'platform_owner');
reset role;
update public.institution_settings set use_bangla_digits = false where institution_id = tests.inst('a');
select tests.reset();
select is(
  (select count(*)::int from public.audit_log where entity_type = 'institution_settings' and action = 'update'
     and actor_role = 'platform_owner' and (meta ->> 'impersonating') = 'true'),
  1, 'a change made during an impersonation session is audited with meta.impersonating = true'
);

update public.impersonation_sessions set ended_at = now() where id = '00000000-0000-0000-0000-00000000c001';
select is(tests.count_as('platform', 'platform_owner', $$select 1 where private.has_role(tests.inst('a'), array['institution_admin'])$$), 0::bigint, 'an ended session grants nothing');
update public.impersonation_sessions set ended_at = null, expires_at = now() - interval '1 second' where id = '00000000-0000-0000-0000-00000000c001';
select is(tests.count_as('platform', 'platform_owner', $$select 1 where private.has_role(tests.inst('a'), array['institution_admin'])$$), 0::bigint, 'an expired session grants nothing');
update public.impersonation_sessions set expires_at = now() + interval '1 hour', platform_admin_id = tests.user_id('a', 'institution_admin') where id = '00000000-0000-0000-0000-00000000c001';
select is(tests.count_as('a', 'institution_admin', $$select 1 where private.has_role(tests.inst('a'), array['teacher'])$$), 0::bigint, 'a session row naming a user who is not a platform owner grants nothing');

-- ===== exposure of the private schema ==========================================
select is(has_schema_privilege('anon', 'private', 'usage'), false, 'anon has no usage on schema private');
select is(has_function_privilege('anon', 'private.has_role(uuid, text[])', 'execute'), false, 'anon cannot execute private.has_role');
select is(has_function_privilege('authenticated', 'private.has_role(uuid, text[])', 'execute'), true, 'authenticated can execute private.has_role (policies run as the caller)');

select * from finish();
rollback;
