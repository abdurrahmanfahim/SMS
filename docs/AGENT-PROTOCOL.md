# Agent protocol (shared by every task file)

Every task file `docs/tasks/<ID>.md` is a self-contained runbook. The Owner tells you only: `follow docs/tasks/<ID>.md`. This document holds the details the runbooks refer to.

## 1. People and words

- **Owner:** the human founder. Reads only your short final message (in Bangla) and, when needed, your report.
- **Leader:** Claude in a separate chat. Reads your report, decides accepted / changes requested / blocked, and updates the plan.
- **Agent:** you. **CI:** the automated checks; they decide whether code is acceptable.

## 2. Order of authority

1. The task file you were told to follow: what you do.
2. `docs/spec/*`: what the product is (data model, permissions, results engine, fees and alerts, UX, mobile).
3. README section 2 (decisions) and section 9 (Definition of Done).
4. If these still leave a choice: pick the safest, most conventional option, write it as an assumption in the report, and continue. Never ask the Owner.
5. If two specs contradict each other, or the task is impossible as written: BLOCKED (section 10 of the task file).

## 3. Repository facts

- Layout: `apps/web`, `packages/{domain,db,ui,config}`, `supabase/{migrations,functions,tests,seed}`, `e2e/`, `spikes/`, `docs/`.
- Scripts (from the root): `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e`, `pnpm db:start|reset|test|types`.
- Branch: `agent/<ID>`, created and pushed by the check-in script (section 12). Commit messages: `<ID>: <what changed>`. PR title: `<ID>: <title>`. Never push to `main`; never merge your own PR. Push after every step.
- Migrations: `YYYYMMDDHHMM_<ws>_<desc>.sql`, forward-only.

## 4. What "a dependency is done" means

The dependency's report `docs/reports/<DEP>.md` exists on `main` with Status `Done` or `Done with deviations`. Merging the PR is how the Owner records the Leader's acceptance. A report on a branch that is not merged does not count.

## 5. Report status values

- **Done:** every criterion met with evidence.
- **Done with deviations:** all criteria met, but something differs from the file (explain each deviation).
- **Partial:** some criteria are not met (say which and why). Deliver the largest coherent subset; never rush the rest.
- **Blocked:** you could not proceed (say exactly what you need).

## 6. Evidence

Acceptable: command and its output, test names and results, file paths, screenshots saved under `docs/reports/<ID>/`, URLs you opened with the access date. Not acceptable: "works", "should work", "I checked".

## 7. Ambiguity and surprises

- Unclear wording: choose the reading that matches the specs and the goal; record it under "Deviations and assumptions".
- Red baseline or failing unrelated tests: BLOCKED, do not fix them.
- Flaky test: re-run up to 3 times; if it still flakes, report it with the run links. Never disable it.
- The task turns out larger than expected: finish the largest coherent piece, report Partial, and list what remains. Do not rush or cut corners on tests.
- You spot a bug or improvement outside your scope: write it under "Requests"; do not fix it.

## 8. Security and privacy

- Use only synthetic Bangla data (invented names, phone numbers like `01700000000`). Never real people.
- Never log personal data. Never print secrets, even in errors.
- If you find a secret in the repository, in a log or in a file: stop, do not copy it anywhere, BLOCKED, and tell the Owner in Bangla to rotate it.
- Never ask the Owner to paste passwords or tokens into a chat or a file.

## 9. Chat-only mode (documents and design tasks only)

If you have no repository or file access and the task is documentation, research or design: produce each deliverable as a complete file in your answer under the heading `FILE: <path>`, then the report the same way, then the Bangla final message telling the Owner to save the files at those paths. Code tasks cannot run in chat-only mode: BLOCKED with the line "এই টাস্কে রিপোজিটরি ও টার্মিনালের অ্যাক্সেস লাগবে।"

## 10. Final message to the Owner

Bangla, at most 8 lines, using exactly the template in the task file. No questions, no long explanations, no plans for the next task.

## 11. Definition of Done (short form; README section 9 is the source)

Acceptance criteria met with evidence; CI green (lint, typecheck, tests; RLS tests for schema changes; e2e where a flow changed); migrations apply from scratch; no secrets; i18n complete; works at 360 px with touch only and the on-screen keyboard open; axe has no serious or critical violations; docs updated; report submitted.

## 12. Check-in (hajira)

Every agent task starts with `bash scripts/checkin.sh <ID> "<agent name and model>"` (section 0 of the task file). It does five things:

1. Refuses to start (exit 10) if `docs/reports/<ID>.md` on `main` already says Done.
2. Refuses to start (exit 11) if `agent/<ID>` exists and is `In progress` (or has no report) with activity in the last 6 hours: another agent is working on it.
3. Resumes (exit 0, prints `RESUME:`) if the branch exists but its report says Blocked or Partial, or it has been silent for more than 6 hours; the report's Check-in log records who took over.
4. Otherwise creates branch `agent/<ID>` from up-to-date `main`.
5. Writes and pushes a report stub (`**Status:** In progress`, `**Started:**`, `**Agent:**`, Check-in log) so the Owner and the Leader can see the task has started.

Rules:
- Keep the Started and Agent lines and the Check-in log when you write the final report. Add a log line when you finish.
- Push after every step. The time of your last commit is your heartbeat; after 6 quiet hours anyone may take your task over.
- If you are stopping for any reason, update the Status (Blocked or Partial) and push, so the next check-in can resume from your branch.
- `bash scripts/board.sh` prints every task's state, last activity, commits ahead of `main` and agent name. The Owner and the Leader use it to see who is doing what.
- Chat-only mode (no repository access): skip the check-in and say so in the report.
