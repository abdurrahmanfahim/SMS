# Agent instructions

This file and `CLAUDE.md` are identical. Read whichever your tool looks for.

## The one rule that matters

When the Owner says **follow &lt;file&gt;.md**, open that file under `docs/tasks/` and execute
it exactly as written, in order. Do not ask questions; if blocked, follow its BLOCKED section.

Everything else below is context, not a substitute for the task file itself.

## Full protocol

`docs/AGENT-PROTOCOL.md` is the shared reference for how reports, commits, evidence,
self-review and blocking work across every task. Read it before starting any task.

## Path ownership

Touch only the paths your task's own runbook lists as "owned paths." If you need a
change outside them, list it under "Requests" in your report — do not make it yourself.
The full ownership table is `README.md` §5.

## Root scripts (contract — do not rename)

```bash
pnpm dev          # start apps/web locally
pnpm build        # build every package/app
pnpm lint         # eslint, workspace-wide (via turbo)
pnpm typecheck    # tsc --noEmit, workspace-wide (via turbo)
pnpm test         # vitest, workspace-wide (via turbo)
pnpm e2e          # playwright, builds and serves apps/web first
pnpm format       # prettier --write, owned-path scope only
pnpm format:check # prettier --check, owned-path scope only
```

## Non-negotiables (from README §3.2, restated here for convenience)

- Every tenant table has RLS enabled; isolation is enforced by Postgres, never by app code.
- Money is integer poisha; marks are integer hundredths in calculations. Never floats.
- All user-visible text goes through i18n keys (Bangla first, English second).
- No secrets in code, docs, logs, commits or chat — use `.env.example` placeholders.
