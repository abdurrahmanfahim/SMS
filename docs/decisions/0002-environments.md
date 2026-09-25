# ADR 0002 — Environments

**Status:** Accepted (this task, M0-P2) · **Date:** 2026-09-24

## Context

D-10 (hosting region) and the Bangladesh PDPA data-residency flag the Leader recently added to `README.md` both touch where data actually lives; this task needs to define, concretely, how many separate Supabase projects/environments this product has, what each is for, and how a change moves between them — before any real schema or data exists, so the pattern is set once rather than improvised later under pressure.

## Decision: three environments, strictly separated by project (not by schema or flag)

| Environment    | Purpose                                                                                      | Supabase project                                                         | Who can access                                                               | Created by                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Local**      | Every developer's/agent's own machine; disposable, reset freely                              | None — a Docker-based local stack via the Supabase CLI (`pnpm db:start`) | Whoever is working on that machine                                           | Automatic, via `supabase start` (this task)                                                                 |
| **Staging**    | Shared environment for manual QA, demos, and the eventual pilot institutions' first real use | One real hosted Supabase project                                         | Owner, and whichever CI job a future deploy task explicitly grants access to | Owner, in `M0-O0` (an Owner-led task, not yet confirmed done as of this task — see `docs/reports/M0-P2.md`) |
| **Production** | Real institutions' real data, once the product is ready to leave the pilot phase             | Not created yet                                                          | Owner only, until a deploy task changes that                                 | A future task, not this one                                                                                 |

**No environment shares a database, a project, or a schema flag with another.** This is a deliberate, stricter-than-strictly-necessary choice: a shared project with an `environment` column or a schema-per-environment scheme is possible in Postgres, but it means one bad migration or one leaked staging credential can touch production data too. Fully separate Supabase projects mean a staging mistake is contained to staging, full stop — worth the minor duplication of running the same migrations twice (once per real environment) rather than the risk of ever mixing the two.

## How a change moves between environments

1. Written and tested **locally** first — every migration is developed and pgTAP-tested against the local stack (`pnpm db:reset && pnpm db:test`), never against staging directly.
2. Reviewed via the normal PR process (this task's own `.github/pull_request_template.md`/CODEOWNERS from `M0-P1`).
3. Pushed to **staging** manually by the Owner (`pnpm db:push:staging`, per `docs/runbooks/supabase-setup.md`) — deliberately not automated in this task, since no deploy pipeline exists yet and pushing schema changes to a shared environment should be a conscious human action until a future task decides to automate it with proper safeguards (staged rollout, backup-before-push, etc.).
4. **Production** promotion: not applicable yet — no production project exists. A future task will need to decide whether production promotion is manual (like staging) or gated behind an approval step; not decided here.

## Consequences

- Every migration must apply cleanly to a **fresh** database (local, staging, and eventually production all start from the same empty state and replay the same ordered migration history) — this is why `docs/decisions/0003-migrations.md` requires migrations to be forward-only and to never assume pre-existing data.
- Secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` for staging, and their production equivalents later) exist only in the Owner's own storage and, for CI, in GitHub Actions repository secrets set up by a future deploy task — never in this repository, per `docs/runbooks/supabase-setup.md`'s "Where each secret lives" table.
- CI's `db` job (`M0-P2` step 6) only ever runs against a fully local, ephemeral, in-container Supabase instance — it never touches staging or production, and never needs their credentials, which is exactly why it can run on every PR with no secrets configured.
- The Bangladesh PDPA data-residency question the Leader flagged applies to **staging and production**, not local (a developer's own laptop is not "hosting" in the regulatory sense the flag is about) — this ADR does not resolve that question, it only makes clear which environment(s) it actually concerns once an answer exists.
