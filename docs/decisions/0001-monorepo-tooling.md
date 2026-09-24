# ADR 0001 — Monorepo tooling

**Status:** Accepted (this task, M0-P1) · **Date:** 2026-09-23

## Context

D-03 fixes the stack (TypeScript strict, React 19, Vite, Tailwind, shadcn/Radix, Supabase,
pnpm monorepo, Netlify). This task (M0-P1) has to pick the remaining tooling: package
manager task-runner, linter, formatter, test runners, and CI — none of which D-03 names
directly, and all of which need to work for a small monorepo with several packages
(`apps/web`, `packages/{domain,db,ui,config}`) plus a separate `e2e/` Playwright project.

## Decisions

### Package manager: pnpm (already fixed by D-03)

Pinned via `packageManager` in the root `package.json` (`pnpm@12.6.0`) so every
contributor and CI use the exact same version. `corepack enable` activates it without a
separate global install step.

### Task runner: Turborepo

**Chosen.** A small, focused task runner that understands the pnpm workspace graph,
caches task output, and lets every package define its own `lint`/`typecheck`/`test`/`build`
script while the root just orchestrates them (`turbo run <task>`).
**Alternatives rejected:**

- **Nx** — more powerful (generators, plugins, richer graph visualisation) but heavier to
  configure and learn than this repo's current size needs; "prefer boring, widely used
  tools and a small dependency list" (task notes, §5.4) favours the simpler tool.
- **Plain pnpm `-r` (recursive) scripts, no task runner** — simplest possible option, but
  loses caching and the dependency-aware run order (`^build` before `build`) that will
  matter once `packages/domain`/`packages/db` grow and `apps/web` depends on their build
  output. Not worth revisiting later just to save one dependency now.

### Linting: ESLint 9 flat config + typescript-eslint

**Chosen.** ESLint's flat-config format is the current supported direction for ESLint 9+,
and typescript-eslint's `recommended` presets cover most TypeScript-specific rules without
hand-picking each one. `eslint-plugin-react-hooks` and `eslint-plugin-import` (import order)
are added because the app package uses React hooks and a multi-package repo benefits from
a consistent import order. All of this lives once in `packages/config/eslint.config.js`
and every package's own `eslint.config.js` re-exports it, so a rule change happens in one
place.
**Alternatives rejected:**

- **Biome** (combined linter+formatter, much faster) — a real contender, but it is younger,
  has smaller React/TypeScript-ecosystem-specific rule coverage than ESLint+typescript-eslint
  today, and mixing "boring, widely used" with a newer all-in-one tool felt like the wrong
  trade for a project's very first task. Worth reconsidering later if ESLint's speed becomes
  a real problem (not yet, at this repo size).

### Formatting: Prettier

**Chosen.** The de facto standard, zero-config-by-default formatter; one shared
`.prettierrc.json` at the repo root, `format`/`format:check` scripts run over only this
task's owned paths (`apps/`, `packages/`, `e2e/`, and a short list of root config files) —
**deliberately not the whole repository**, because other workstreams (Leader's `docs/`,
`README.md`) are not this task's to reformat, and a first attempt at a repo-wide
`prettier --write .` during this task's own execution proved that point by reformatting
`README.md` and every file under `docs/` before being caught and reverted. The scripts are
scoped explicitly for that reason, not just for tidiness.
**Alternatives rejected:** Biome's formatter (see above, same reasoning); no formatter at
all (rejected — inconsistent style across many small agent-authored PRs would create noisy
diffs).

### Unit tests: Vitest (+ Testing Library for `apps/web`)

**Chosen.** Vitest shares Vite's config and transform pipeline, so `apps/web` needs no
second bundler config for tests; `packages/domain`/`packages/db`/`packages/ui` use it too
for consistency even though they do not need Vite's dev server. `@testing-library/react` is
added only in `apps/web` for component-rendering assertions (used by the one placeholder
test, `App.test.tsx`).
**Alternatives rejected:** Jest — mature and widely used, but needs separate transform
configuration to work with Vite/ESM and would duplicate what Vite already knows; not worth
it when Vitest exists specifically to avoid that duplication.

### E2E: Playwright

**Chosen.** Already implied by the product's own quality bar (`docs/spec/ux-standard.md`,
phone-first testing) and it is the current standard choice for browser E2E testing with
first-class multi-browser support if mobile-viewport/browser testing needs to expand later.
Configured with a `webServer` block that builds and serves `apps/web` before running the
one smoke test, so `pnpm e2e` works from a clean checkout with no manually-started server.
**Alternatives rejected:** Cypress — a reasonable alternative, but Playwright's built-in
multi-browser and mobile-viewport emulation support fits this product's phone-first
requirement (D-16-adjacent, `docs/spec/mobile-complete.md`) more directly out of the box.

### CI: GitHub Actions

**Chosen.** The repository already lives on GitHub (D-13); GitHub Actions needs no third
-party CI account and integrates directly with PR checks and branch protection. One
workflow (`ci.yml`) runs on `pull_request` and `push` to `main`, with a single job named
`ci / checks` covering install → lint → format:check → typecheck → test → build → e2e, so
there is exactly one required status check to configure in branch protection (see the
report's Task-specific items for the exact name).
**Alternatives rejected:** none seriously considered — no other CI system offers a
comparable zero-setup integration with a GitHub-hosted repo, and D-13 already fixed GitHub
as the host.

## Consequences

- Every later task's root-level commands (`pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`, `pnpm e2e`, `pnpm format`, `pnpm format:check`) are now a contract other
  task briefs can assume exist (per `README.md` §5.3's "Root script names are a contract").
- Adding a new package means: add its `package.json` with the standard `lint`/`typecheck`/
  `test`/`build` scripts, have it extend `@sms/config`'s `tsconfig.base.json` and
  `eslint.config.js`, and Turborepo picks it up automatically via the pnpm workspace glob —
  no changes to `turbo.json` or the root `package.json` are needed for a normal new package.
- `format`/`format:check` are intentionally scoped to this task's owned paths, not the
  whole repo — a future task that wants Prettier over `docs/` (a Leader-owned path) should
  add that as its own explicit script/glob, not widen these ones.
