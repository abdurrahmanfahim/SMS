-- RLS test helpers (task M1-P1). API documented in docs/spec/rls-patterns.md.
--
-- This file is also a valid pgTAP file: `supabase test db` runs it first (it sorts before the
-- subfolders), it installs the helpers in schema `tests` and COMMITS them, so every later test
-- file in the same run can call them. The schema holds no data and is never part of a migration,
-- so it exists only in databases where tests have run (local and CI).
--
-- Typical use in a test file:
--   begin;
--   select plan(3);
--   select tests.create_fixture();
--   select tests.act_as('a', 'teacher');                   -- sign in as institution A's teacher
--   select is((select count(*)::int from public.some_table), 4, 'teacher A sees 4 rows');
--   select tests.reset();                                  -- back to the owner role
--   select finish(); rollback;
begin;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Deterministic ids, no data needed: the same input always gives the same uuid.
-- ---------------------------------------------------------------------------
create or replace function tests.inst(which text)
returns uuid language sql immutable as $$
  select md5('sms-test-institution:' || which)::uuid;
$$;

create or replace function tests.user_id(which text, role text)
returns uuid language sql immutable as $$
  select md5('sms-test-user:' || which || ':' || role)::uuid;
$$;

create or replace function tests.roles()
returns text[] language sql immutable as $$
  select array['institution_admin', 'teacher', 'accountant', 'guardian', 'student'];
$$;

-- ---------------------------------------------------------------------------
-- Fixture: institutions 'a' and 'b', each with one active user per membership role, plus one
-- platform owner ('platform','platform_owner') and one user with no membership
-- ('none','outsider'). Call once per test transaction, as the owner role.
-- ---------------------------------------------------------------------------
create or replace function tests.create_fixture()
returns void language plpgsql as $$
declare
  which text;
  r text;
  uid uuid;
begin
  foreach which in array array['a', 'b'] loop
    insert into public.institutions (id, name_en, slug, status)
    values (tests.inst(which), 'Test institution ' || which, 'test-inst-' || which, 'active');
    foreach r in array tests.roles() loop
      uid := tests.user_id(which, r);
      insert into auth.users (id, email) values (uid, r || '.' || which || '@test.invalid');
      insert into public.profiles (id, full_name) values (uid, 'Test ' || r || ' ' || which);
      insert into public.memberships (institution_id, profile_id, role, status)
      values (tests.inst(which), uid, r, 'active');
    end loop;
  end loop;

  uid := tests.user_id('platform', 'platform_owner');
  insert into auth.users (id, email) values (uid, 'platform.owner@test.invalid');
  insert into public.profiles (id, full_name) values (uid, 'Test platform owner');
  insert into public.platform_admins (profile_id) values (uid);

  uid := tests.user_id('none', 'outsider');
  insert into auth.users (id, email) values (uid, 'outsider@test.invalid');
  insert into public.profiles (id, full_name) values (uid, 'Test outsider');
end;
$$;

-- ---------------------------------------------------------------------------
-- Acting as a user. These switch the database role for the rest of the transaction, so the
-- queries that follow are checked by RLS exactly as an API request would be.
-- ---------------------------------------------------------------------------
create or replace function tests.act_as(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
end;
$$;

-- act_as('a', 'teacher'), act_as('b', 'institution_admin'), act_as('platform', 'platform_owner'),
-- act_as('none', 'outsider')
create or replace function tests.act_as(which text, role text)
returns void language sql as $$
  select tests.act_as(tests.user_id(which, role));
$$;

create or replace function tests.act_as_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
end;
$$;

create or replace function tests.act_as_service()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  set local role service_role;
end;
$$;

-- Back to the owner role with no signed-in user.
create or replace function tests.reset()
returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end;
$$;

-- How many rows a query returns for a user (RLS applies); returns to the owner role afterwards.
-- count_as('a', 'teacher', 'select 1 from public.memberships')
create or replace function tests.count_as(which text, role text, query text)
returns bigint language plpgsql as $$
declare
  n bigint;
begin
  perform tests.act_as(which, role);
  execute 'select count(*) from (' || query || ') q' into n;
  perform tests.reset();
  return n;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Keep the helper functions (they hold no data), then run the self-test in a rolled-back
-- transaction so its fixture rows never persist.
commit;

begin;

select plan(13);

-- ---------------------------------------------------------------------------
-- Self-test of the helpers (also what makes this file a valid TAP file).
-- ---------------------------------------------------------------------------
select has_schema('tests', 'schema tests exists');
select has_function('tests', 'create_fixture', array[]::text[], 'create_fixture exists');
select has_function('tests', 'act_as', array['text', 'text'], 'act_as(which, role) exists');
select has_function('tests', 'count_as', array['text', 'text', 'text'], 'count_as exists');

select tests.create_fixture();
select is((select count(*)::int from public.institutions where slug like 'test-inst-%'), 2, 'two institutions');
select is((select count(*)::int from public.memberships where institution_id = tests.inst('a')), 5, 'one membership per role in institution a');
select is((select count(*)::int from public.platform_admins), 1, 'one platform owner');

select tests.act_as('a', 'institution_admin');
select is(auth.uid(), tests.user_id('a', 'institution_admin'), 'act_as sets the signed-in user');
select is(current_user::text, 'authenticated', 'act_as switches to the authenticated role');
select tests.reset();
select is(auth.uid(), null, 'reset clears the signed-in user');
select is(current_user::text, session_user::text, 'reset returns to the owner role');

select tests.act_as_anon();
select is(current_user::text, 'anon', 'act_as_anon switches to the anon role');
select tests.reset();

select is(tests.count_as('a', 'institution_admin', 'select 1 from public.institutions'), 1::bigint, 'count_as returns the rows RLS lets the user see');

select * from finish();
rollback;
