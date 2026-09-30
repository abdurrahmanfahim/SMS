# Runbook — Staging deploys, rollback and secrets

Audience: the Owner. Written so it can be followed without asking anyone. Task: M0-P3.

**Staging URL:** _not known yet._ The Owner creates the host project (section 2) and writes its address here and in the M0-P3 report. Until then the deployed-site tests cannot run.

## 1. How a deploy works

1. A pull request is merged into `main`.
2. Workflow `plat-deploy-staging` (`.github/workflows/plat-deploy-staging.yml`) runs three jobs in order:
   1. **migrate** applies new database migrations to the staging Supabase project (`supabase db push`). Migrations are forward-only. If any SQL fails, this job fails and nothing after it runs.
   2. **deploy** asks the static host to build `main` (through the deploy hook, section 3). It only runs after `migrate` succeeded.
   3. **smoke** waits for the site, then runs `pnpm e2e:staging`: sign-in, institution picker, hello dashboard, session persistence, sign-out, and the cross-tenant RLS probe against the real staging API.
3. Separately, `ci.yml` runs on every pull request and push: lint, typecheck, unit tests, build, the **bundle check** (fails if the built site contains the service-role key or the text `service_role`), the local database tests, and the local e2e suites.

## 2. One-time host setup (Owner)

The host is the Owner's choice (README ruling R-08): Cloudflare Pages (already connected as `mms-munshee`) or Netlify. Use these exact settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | empty (repository root) |
| Build command | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @sms/web build` |
| Output directory | `apps/web/dist` |
| Node version | from `.nvmrc` (set `NODE_VERSION` to the number in that file) |
| SPA fallback | already in the repo: `apps/web/public/_redirects` contains `/* /index.html 200` (both hosts read it) |
| Build environment variables | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (staging project's public URL and anon key) |

If the `mms-munshee` project keeps failing, either fix it with the table above or disconnect it.

## 3. Making a failed migration block the deploy (Owner)

A host that builds `main` on its own cannot be held back by GitHub Actions. To make the block real:

1. In the host, turn **off** automatic builds for `main` (Cloudflare Pages: Settings > Builds > "Automatic production branch deployments" off; Netlify: Site configuration > Build & deploy > Stop builds).
2. Create a **deploy hook** for `main` (Cloudflare Pages: Settings > Builds > Deploy hooks; Netlify: Build hooks).
3. Save its URL as the GitHub secret `STAGING_DEPLOY_HOOK_URL`.

Until this is done, the `deploy` job prints a warning and the host deploys by itself; migrations still run first in Actions, but a failed migration would not stop the host build.

## 4. Where each secret lives

Nothing below is ever committed, pasted in chat, or put in a file in this repository.

| Secret | Where it lives | Used by |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | GitHub > Settings > Secrets and variables > Actions; the Owner's password manager | `migrate` job |
| `SUPABASE_SERVICE_ROLE_KEY` | The Owner's password manager, and the Owner's shell only while running `pnpm seed:staging`. **Never** in GitHub Actions for this task, never in the host, never in the site build | `pnpm seed:staging` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Host build environment and GitHub Actions secrets. Public by design; RLS protects the data | site build, `smoke` job |
| `STAGING_URL` | GitHub Actions secret | `smoke` job |
| `STAGING_DEPLOY_HOOK_URL` | GitHub Actions secret | `deploy` job |
| `E2E_STAGING_{SINGLE,MULTI,OTHER}_{EMAIL,PASSWORD}` | GitHub Actions secrets; the Owner's password manager (printed once by the seed script) | `smoke` job |

## 5. First-time staging data (Owner)

After `migrate` has run once (or `pnpm exec supabase db push --linked` from your machine, see `docs/runbooks/supabase-setup.md`):

```bash
SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<from your password manager> pnpm seed:staging
```

It creates 2 institutions and 3 synthetic users (one with two memberships) and prints each password **once**. Save them at once as the `E2E_STAGING_*` secrets and in your password manager. Running it again is safe and never changes an existing user's password. Users: `sms-staging-rahim@…` = SINGLE (school admin), `sms-staging-salma@…` = MULTI (school teacher and madrasa accountant), `sms-staging-karim@…` = OTHER (madrasa teacher).

## 6. Rolling back a bad deploy

**The site (fast, no code change):** in the host, open the list of deployments, pick the last good one and promote it (Cloudflare Pages: Deployments > the good one > "Rollback to this deployment"; Netlify: Deploys > the good one > "Publish deploy"). Then fix forward with a new pull request.

**The database:** migrations are forward-only and are never edited or deleted once applied. To undo a bad migration, write a new migration that reverses it (naming: `YYYYMMDDHHMM_plat_<what>.sql`) and merge it. If data was damaged, restore from a Supabase backup (Project > Database > Backups; availability depends on the plan) and tell the Leader.

**Order when both are bad:** roll the site back first (users see the last good version), then repair the database with a new migration.

## 7. If a secret leaks

Rotate it at once at its source (Supabase dashboard for keys and the database password; the host for the hook URL; GitHub for tokens), update the GitHub secret, and re-run the failed workflow. A service-role key that reached the site build must be rotated even if the deploy was rolled back.
