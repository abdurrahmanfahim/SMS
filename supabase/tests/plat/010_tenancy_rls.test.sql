-- M0-P3 step 1: RLS tests for institutions, profiles, memberships.
-- Pattern per table: allowed user passes, other role/user fails, other tenant fails, anon fails.
begin;

select plan(23);

-- Fixtures (synthetic data only). Users: A in inst 1, B in inst 2, C in both, D suspended in inst 1.
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('b0000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('c0000000-0000-0000-0000-00000000000c', 'c@test.invalid'),
  ('d0000000-0000-0000-0000-00000000000d', 'd@test.invalid');
insert into public.profiles (id, full_name) values
  ('a0000000-0000-0000-0000-00000000000a', 'User A'),
  ('b0000000-0000-0000-0000-00000000000b', 'User B'),
  ('c0000000-0000-0000-0000-00000000000c', 'User C'),
  ('d0000000-0000-0000-0000-00000000000d', 'User D');
insert into public.institutions (id, name_en, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Inst One', 'inst-one'),
  ('22222222-2222-2222-2222-222222222222', 'Inst Two', 'inst-two');
insert into public.memberships (institution_id, profile_id, role, status) values
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'institution_admin', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-00000000000b', 'teacher', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-00000000000c', 'teacher', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-00000000000c', 'accountant', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-00000000000d', 'teacher', 'suspended');

-- Constraints and triggers (as the table owner).
select throws_ok(
  $$insert into public.institutions (name_en, slug) values ('Bad', 'X')$$,
  '23514', null, 'slug format is enforced');
select throws_ok(
  $$insert into public.institutions (slug) values ('no-name')$$,
  '23514', null, 'an institution needs a name');
select throws_ok(
  $$insert into public.profiles (id, full_name, phone_e164) values ('a0000000-0000-0000-0000-00000000000a', 'X', '12345')$$,
  '23514', null, 'profile phone must be an E.164 Bangladeshi mobile');
select throws_ok(
  $$update public.memberships set institution_id = '22222222-2222-2222-2222-222222222222' where profile_id = 'a0000000-0000-0000-0000-00000000000a'$$,
  '23514', 'institution_id is immutable', 'membership institution_id cannot change');
select throws_ok(
  $$insert into public.memberships (institution_id, profile_id, role) values ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'institution_admin')$$,
  '23505', null, 'one row per (institution, profile, role)');

-- Signed in as A.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-00000000000a', true);

select is((select count(*)::int from public.profiles), 1, 'A sees exactly one profile');
select is((select id from public.profiles), 'a0000000-0000-0000-0000-00000000000a'::uuid, 'A sees their own profile');
select is((select count(*)::int from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'), 0, 'A cannot read B''s profile');
select is((select count(*)::int from public.memberships), 1, 'A sees only their own membership');
select is((select count(*)::int from public.memberships where institution_id = '22222222-2222-2222-2222-222222222222'), 0, 'A cannot read institution 2 memberships (other tenant)');
select is((select array_agg(id)::text from public.institutions), '{11111111-1111-1111-1111-111111111111}', 'A sees only institution 1');
select is((select count(*)::int from public.institutions where id = '22222222-2222-2222-2222-222222222222'), 0, 'A cannot read institution 2');
select throws_ok(
  $$insert into public.institutions (name_en, slug) values ('Mine', 'mine-inst')$$,
  '42501', null, 'A cannot create an institution');
select throws_ok(
  $$insert into public.memberships (institution_id, profile_id, role) values ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-00000000000a', 'institution_admin')$$,
  '42501', null, 'A cannot grant themselves a membership');
select throws_ok(
  $$update public.profiles set full_name = 'Hacked' where id = 'a0000000-0000-0000-0000-00000000000a'$$,
  '42501', null, 'clients cannot update profiles in this task');
select throws_ok(
  $$delete from public.memberships$$,
  '42501', null, 'clients cannot delete memberships');

-- Signed in as C (two memberships).
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-00000000000c', true);
select is((select count(*)::int from public.institutions), 2, 'C sees both institutions');
select is((select count(*)::int from public.memberships), 2, 'C sees both own memberships');

-- Signed in as D (suspended in inst 1): sees own membership but not the institution.
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-00000000000d', true);
select is((select count(*)::int from public.institutions), 0, 'a suspended member does not see the institution');
select is((select count(*)::int from public.memberships), 1, 'a suspended member still sees their own membership row');

-- Anonymous.
reset role;
set local role anon;
select throws_ok($$select * from public.institutions$$, '42501', null, 'anon cannot read institutions');
select throws_ok($$select * from public.profiles$$, '42501', null, 'anon cannot read profiles');
select throws_ok($$select * from public.memberships$$, '42501', null, 'anon cannot read memberships');

select * from finish();
rollback;
