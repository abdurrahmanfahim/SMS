# ADR 0003 — Migrations

**Status:** Accepted (this task, M0-P2) · **Date:** 2026-09-24

## Context
Every future task that touches the database (`M1-A1`, `M2-E1`, `M3-F1`, etc.) will add migrations. This task needs to fix the naming convention, the forward-only rule, and the RLS/testing requirement now, once, rather than having each future task invent its own.

## Decisions

### Naming: `YYYYMMDDHHMM_<ws>_<short-description>.sql`
- `YYYYMMDDHHMM` — UTC timestamp, to the minute, matching what `supabase migration new`/`supabase db diff -f` generate by default, so hand-created and tool-generated files sort the same way. Get it with `date -u +%Y%m%d%H%M`.
- `<ws>` — the short workstream code that owns the change (`plat`, `acad`, `exam`, `fin`, `comm`, per `README.md` §5), so `ls supabase/migrations` alone tells you who to ask about a given migration.
- `<short-description>` — lowercase, hyphen-separated, a few words (`baseline`, `students-and-guardians`, `fee-plans`).
- Example (this task's own baseline): `202609241850_plat_baseline.sql`.

### Forward-only — never edit a migration that has shipped
Once a migration file exists in a commit that has been merged to `main` (i.e., it may already be applied somewhere — local dev, staging, or later production), **it is never edited again**. A mistake in an already-shipped migration is fixed by writing a **new** migration that corrects it (e.g. `alter table ... add column ...` or a data-fix statement), not by going back and changing the original file. Reasons:
- Every environment (per `docs/decisions/0002-environments.md`) replays the exact same ordered history of migration files starting from empty. If a shipped file's content changes, an environment that already applied the old version and one that's about to apply the new version diverge silently — there is no way to detect this without literally diffing applied-migration checksums, which Supabase's CLI does track, but relying on that as a safety net rather than just not editing shipped files is backwards.
- A migration still on your own branch, not yet merged, **may** be edited freely — it hasn't shipped to anyone else yet.

### Every migration touching a table needs RLS, and the test must catch a miss
Per README §3.2 ("Every tenant table has RLS enabled") and this task's own baseline (`private.tables_without_rls()`, `supabase/tests/plat/000_rls_enabled.test.sql`): any migration that does `create table public.<name> (...)` must, in the same migration, also run `alter table public.<name> enable row level security;` and add whatever policies the table needs. The pgTAP test from this task will fail the `db` CI job if this is forgotten — that is the whole point of the test, not an optional nicety.

### How to fix a bad migration that's already shipped
1. **If it's just wrong (bug, typo, missing constraint) and no real data depends on the mistake yet:** write a new migration that corrects it (e.g. `alter table ... alter column ... type ...`, or drop-and-recreate a function/policy). Never edit the old file.
2. **If it dropped or corrupted real data:** this is a production incident, not a migration-authoring question — follow whatever incident process exists by the time real data exists (not yet decided, since there's no production environment yet per `docs/decisions/0002-environments.md`).
3. **If a migration was merged to `main` but never actually applied anywhere yet** (caught same-day, before any environment ran it): still don't edit it if any other agent/PR might already be based on it — check with the Leader first. When in genuine doubt, a corrective migration is always the safer default.

### What belongs in `supabase/migrations` vs elsewhere
- Schema changes (tables, columns, indexes, functions, triggers, policies, schemas) → `supabase/migrations/*.sql`, per the naming rule above.
- Non-destructive, idempotent sample/dev data → `supabase/seed/dev.sql` (this task's step 8) and per-workstream seed files under `supabase/seed/<ws>/`, applied by `supabase db reset` after every migration — never mixed into a migration file itself, since seed data is dev/demo convenience, not schema.
- pgTAP tests → `supabase/tests/<ws>/*.test.sql`, one concern per file, run via `pnpm db:test`.

## Consequences
- `pnpm db:reset` must always work from a completely empty database, replaying every migration in order — this is the actual definition of "the migrations are correct," not just "they worked on my machine once."
- Any future task that needs to change something a previous migration got wrong writes a new file; this ADR is what a future agent should point to if asked to "just fix" an old migration in place.
