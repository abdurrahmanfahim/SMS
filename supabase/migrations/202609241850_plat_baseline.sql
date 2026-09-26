-- M0-P2 step 3: baseline migration.
-- Forward-only (per docs/decisions/0003-migrations.md) — never edit this file once it has
-- shipped; a mistake here gets fixed by a new migration, not by rewriting this one.

-- ---------------------------------------------------------------------------
-- 1. `private` schema: internal-only helpers and trigger functions.
--    Not in config.toml's [api].schemas list (only "public" and "graphql_public"
--    are), so nothing in here is ever reachable through the PostgREST API,
--    regardless of RLS or GRANTs. Product tables never live here — this schema
--    is for infrastructure the API should never see.
-- ---------------------------------------------------------------------------
create schema if not exists private;

comment on schema private is
  'Internal-only helpers and trigger functions. Deliberately excluded from '
  'config.toml''s [api].schemas so PostgREST never exposes anything in here, '
  'independent of RLS or GRANTs. Never put a product table in this schema.';

-- ---------------------------------------------------------------------------
-- 2. Generic updated_at trigger.
--    Every product table with an `updated_at` column should attach this via:
--      create trigger set_updated_at before update on public.<table>
--        for each row execute function private.set_updated_at();
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function private.set_updated_at() is
  'Generic BEFORE UPDATE trigger: sets NEW.updated_at = now(). Attach to any '
  'public table that has an updated_at column.';

-- ---------------------------------------------------------------------------
-- 3. RLS-check helper.
--    Returns one row per table in the `public` schema that does NOT have row
--    level security enabled. An empty result means every public table is
--    protected. Used by supabase/tests/plat/000_rls_enabled.test.sql (step 4)
--    and safe to run manually at any time as a spot check:
--      select * from private.tables_without_rls();
--    Ordinary views and partitioned-table parents are excluded: views have no
--    RLS concept of their own (they inherit from their underlying tables,
--    which this function does check), and this product does not use table
--    partitioning in v1.
-- ---------------------------------------------------------------------------
create or replace function private.tables_without_rls()
returns table (schema_name text, table_name text)
language sql
stable
as $$
  select n.nspname::text as schema_name, c.relname::text as table_name
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r' -- ordinary tables only, not views/sequences/etc.
    and c.relrowsecurity = false;
$$;

comment on function private.tables_without_rls() is
  'Returns every ordinary table in the public schema that does NOT have row '
  'level security enabled. Empty result = every table is protected. Used by '
  'supabase/tests/plat/000_rls_enabled.test.sql.';
