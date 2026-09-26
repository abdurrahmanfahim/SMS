-- pgTAP test: every ordinary table in the public schema must have row level
-- security enabled. This is the project's core tenant-isolation invariant
-- (README §3.2: "Every tenant table has RLS enabled; isolation is enforced
-- by Postgres, never by app code.") — this test is what makes that a
-- CI-enforced fact rather than a hoped-for convention.
--
-- How to prove it catches a real miss (documented here since it could not be
-- run in this sandbox — see docs/reports/M0-P2.md "Deviations"):
--   1. Temporarily add a migration creating `create table public.temp_no_rls
--      (id uuid primary key);` with no `alter table ... enable row level
--      security;` statement.
--   2. Run `pnpm db:reset && pnpm db:test`.
--   3. This test fails, because `private.tables_without_rls()` (defined in
--      202609241850_plat_baseline.sql) now returns one row
--      (public, temp_no_rls) instead of zero.
--   4. Remove the temporary migration; the test passes again.
begin;

select plan(1);

select is_empty(
  'select * from private.tables_without_rls()',
  'Every ordinary table in the public schema has row level security enabled'
);

select * from finish();

rollback;
