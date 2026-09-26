# Runbook — Supabase local development and staging

Audience: anyone (Owner or agent) setting up this repo locally, or linking a staging Supabase project for the first time. Written so the Owner can follow it without needing to ask anyone anything.

## Prerequisites
- Docker Desktop (or Podman) installed and running. `supabase start` needs it to run Postgres, GoTrue, PostgREST, and the rest of the local stack in containers. **This is a hard requirement** — there is no way to run the local Supabase stack without a working Docker (or Podman) install.
- Node 22 and pnpm (per `.nvmrc`/`package.json`'s `packageManager`), already covered by `M0-P1`'s setup.

## First-time local setup
```bash
pnpm install               # installs the pinned `supabase` CLI as a dev dependency too
pnpm db:start               # starts local Postgres + the Supabase stack in Docker
pnpm db:reset               # applies every migration in supabase/migrations, then supabase/seed/dev.sql
pnpm db:test                # runs the pgTAP tests in supabase/tests
```
`supabase start` prints local URLs and keys (API URL, anon key, service_role key, Studio URL) the first time it runs — these are **local-only, non-secret, always-the-same-value-on-every-machine** development credentials, not real secrets (the actual anon/service_role keys that matter are the ones for hosted projects, described below). Copy the printed API URL and anon key into a `.env.local` file (based on `.env.example`) if you want `apps/web` to talk to your local instance.

Day to day:
```bash
pnpm db:stop     # stop the local stack (frees Docker resources)
pnpm db:start    # start it again — data persists between stop/start
pnpm db:reset    # wipe and re-apply everything from scratch (use after writing a new migration)
```

## Writing a new migration
See `docs/decisions/0003-migrations.md` for the full naming/forward-only/RLS rules. Short version:
```bash
# Option A: hand-write the SQL file yourself
touch supabase/migrations/$(date -u +%Y%m%d%H%M)_<ws>_<short-description>.sql

# Option B: make schema changes in the local Studio/psql, then diff them into a migration file
pnpm db:diff -- -f <short-description>
```
Then `pnpm db:reset && pnpm db:test` to confirm it applies cleanly and every RLS check still passes.

## Regenerating types after a schema change
```bash
pnpm db:types
```
This overwrites `packages/db/src/types.ts`. Commit the result. CI's `db` job (`.github/workflows/ci.yml`) runs this same command and fails the build if the committed file would differ — so a forgotten `pnpm db:types` after a real migration is caught automatically, not just by convention.

## Linking and pushing to staging (Owner-led; M0-O0 creates the actual project)
This section assumes `M0-O0` has already created a staging Supabase project (this task, `M0-P2`, does not create one — see its own out-of-scope note). Once that project exists:

1. **Get three values from the Owner** (from the Supabase dashboard for that project, or from wherever the Owner is storing them — never from this repo, which contains none of them):
   - `SUPABASE_ACCESS_TOKEN` — a personal access token for the Supabase CLI (Account → Access Tokens on supabase.com), used to authenticate `supabase link`/`supabase db push`.
   - `SUPABASE_PROJECT_REF` — the project's reference ID (visible in its dashboard URL and in Project Settings).
   - `SUPABASE_DB_PASSWORD` — the database password set when the project was created.
2. **Set them in your shell** (not in any file this repo tracks):
   ```bash
   export SUPABASE_ACCESS_TOKEN=...
   export SUPABASE_PROJECT_REF=...
   export SUPABASE_DB_PASSWORD=...
   ```
3. **Link once:**
   ```bash
   pnpm exec supabase link --project-ref "$SUPABASE_PROJECT_REF"
   ```
4. **Push migrations:**
   ```bash
   pnpm db:push:staging
   ```
   This pushes every migration in `supabase/migrations` that staging doesn't have yet, **forward-only** — there is no "push a fix to an already-applied migration" operation; a mistake becomes a new migration (`docs/decisions/0003-migrations.md`).

**Never run `db:push:staging` (or `supabase link`/`supabase db push` directly) in CI.** CI's `db` job only ever talks to an ephemeral, local, in-container Supabase instance with no real credentials — pushing to staging or production is a deliberate, human-run action, not an automated one, until a real deployment pipeline task decides otherwise.

## Where each secret lives (once they exist)
| Secret | Where it lives | Who can see it |
|---|---|---|
| Local dev anon/service_role keys | Printed by `supabase start`; identical on every machine, not sensitive | Anyone running this repo locally |
| Staging `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` | Nowhere in this repo — the Owner holds these, sets them as local shell env vars or (for CI, once a real deploy task wires it up) as GitHub Actions repository secrets | Owner; whichever CI job a future task explicitly grants them to |
| Production equivalents | Same pattern as staging, once a production project exists (not yet, per README's roadmap) | Owner only, until a deploy task changes that |

## Troubleshooting
- `supabase start` fails or hangs: confirm Docker is actually running (`docker info`); on a constrained machine/CI runner, `db.health_timeout` in `supabase/config.toml` (currently the CLI default, 2 minutes) may need raising.
- `pnpm db:test` fails: read the pgTAP output — it names exactly which assertion failed (e.g. which table lacks RLS). Fix the migration, `pnpm db:reset && pnpm db:test` again.
- Types drift in CI: run `pnpm db:types` locally and commit the result.
