# Leader rulings

Decisions the Leader (Claude) made in answer to questions raised in agent reports. Newest last. An Owner decision overrides any ruling here.

## Batch 1 (after the reports of M0-S2, M0-W1, M1-U3, M2-D1, M3-D1)

**R-01 — Result-engine assumptions (from M2-D1).** Grade from the _rounded_ GPA, subject grades from the exact percent, and the absent-handling rule (`all_absent`) are accepted as written in `packages/domain/src/results/`. They are provisional: verify them against the real marksheets and grading rules collected in `M0-O1`; a difference becomes a change request on `M2-D1`, not a silent edit. The output shapes `SubjectResult` and `OverallResult`, the snapshot checksum and the error codes documented in the TSDoc of `packages/domain/src/results/` are now the contract for `M2-D2`, `M2-E3` and `M2-E4` (see `docs/spec/results-engine.md` section 8).

**R-02 — Fee-logic assumptions (from M3-D1).** Waiver combination (in list order, each on the amount still payable), `once` and `per_exam` billing only by explicit item id, `term` and `months` handling, and aging day 0 are accepted provisionally. Confirm with the pilot answers to the questions in `docs/spec/fees-and-alerts.md` section 8 before `M3-F2`.

**R-03 — Default Bangla alert texts (from M3-D1).** The renderer and `countSegments` are ready; the four default texts (`absent_alert`, `fee_due`, `result_published`, `notice`) are now part of `M3-T2`.

**R-04 — Attendance control width (from M1-U3).** No exception to the 44 px rule. The attendance row defaults to Present and shows two controls, Present and Absent, plus a "more" button that opens a bottom sheet (Late, Leave, note). Every control is at least 44x44 CSS px with 8 px between controls; names wrap instead of controls shrinking. Applies to `M2-A5` and to the final prototypes.

**R-05 — Sync conflict policy (from M0-S2).** D-06 is confirmed with the spike's two additions: last-write-wins by delivery order (never by client clock), and the iOS storage-eviction risk (the queue can be deleted silently; sync on app open and on returning to the foreground, and show Pending counts). Additionally: attendance gets an append-only audit table like marks; when a row was changed by someone else after the user loaded it, the UI shows who and when; a rejected op is terminal and its Error state always offers retry, discard, or edit and re-queue. Applies to `M2-P4`, `M2-E2`, `M2-A5`.

**R-06 — App shell (from M0-W1).** Accepted as Partial. The real-device keyboard check is done by the Owner on the Owner's own phones (a low-end Android; an iPhone if possible) during `M1-O4`, and again in `M2-Q3`; it is not an agent task. Lab LCP of 2.1 to 2.4 s in the Playwright proxy and 2.9 s in Lighthouse's simulation is accepted for the shell for now; the field target stays 2.5 s at the 75th percentile. Follow-up is in `M1-W5`: lazy-load route groups and heavy dialog and toast code. The correct ADR for the performance budget is 0005 (0004 is fonts).

**R-07 — CI (from M1-D1, M0-S2, M2-D1, M3-D1).** Root cause of the Actions minutes exhaustion found by M0-S2: the E2E web-server command left an orphan process, so runs hung for hours (about 1,850 billable minutes). Fixed on `main`: `exec` vite directly, `timeout-minutes` on jobs and on the E2E step. `ci / db` now publishes the freshly generated `packages/db/src/types.ts` on branch `bot/db-types` when it detects drift on a push, so it can be merged without running Docker.

**R-08 — Open item for the Owner.** A Cloudflare Pages project (`mms-munshee`) is connected to this repository and its build fails on every push. Either disconnect it, or set it up for this monorepo: root directory empty, build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @sms/web build`, output directory `apps/web/dist`, Node version from `.nvmrc`. The deployment task `M0-P3` names Netlify; the host is the Owner's choice.

## Batch 2 (after the reports of M2-D2 and M0-P3)

**R-09 - Ranking and statistics definitions (from M2-D2).** Accepted as implemented: "top N" is every student with `class_rank <= N`, so ties can return more than N; pass rate is `passed / appeared` (absent students excluded); a subject's averages are over students who appeared; failed students count in overall averages with their stored total and GPA. Ranks use the stored hundredths. These follow common school practice; confirm against `M0-O1` and Munshi parity (`M2-D2` step 3) and change by request, not by silent edit.

**R-10 - Performance guard (from M2-D2, M0-P3).** The results-engine performance test limit is 1,000 ms, not 200 ms: the engine takes tens of milliseconds locally, shared CI runners are several times slower, and the guard exists to catch order-of-magnitude regressions, not to measure speed. The 200 ms figure in the `M2-D1` brief was a local target.

**R-11 - CI-generated types (from M0-P3).** Drift in `packages/db/src/types.ts` is published by CI on the branch `bot/types-<branch name with / replaced by ->` (one branch per source branch, so branches do not overwrite each other). An agent without Docker takes the file from that branch. The older shared branch `bot/db-types` is obsolete.

**R-12 - Skeleton placeholder (from M0-P3).** The shell `/app` placeholder yields to real features; `M1-W2` replaces the skeleton feature and removes it, as its brief already says.

**R-13 - Munshi parity is its own task.** `M2-D2` is accepted without its step 3; the parity tests and `docs/research/munshi-parity.md` are the new task `M2-D3`, which needs the Owner to copy the Munshi source into `docs/samples/munshi/` first. `M2-I1` depends on `M2-D3`.

## Batch 3 (after the reports of M1-P1, M2-D3, M1-W3, M1-U3b)

**R-14 - Answers to M1-P1 and M2-D3.** (1) `has_role_write` and `impersonating` are now in `permissions.md` section 3, and write policies use `has_role_write`. (2) `students.profile_id` (nullable) is added to the domain model and to `M1-A2`. (3) `M1-P2` owns the admin policies on `memberships` and `profiles`. (4) `M1-Q1`'s registry check ignores `helpers.sql`. (5) The independent review of `rls-patterns.md` is a report item of `M1-A1`. (6) Averages: SMS keeps total over full marks; Munshi's mean-of-percents is a known difference that the importer flags (`M2-I1`); an `average_method` option is added to the engine only if `M0-O1` shows schools use mean-of-percents. (7) Ranking ties and failed students keep the spec defaults (competition ties, failed students not ranked) until `M0-O1` says otherwise; whether a failed subject fails the student in a percentage scheme also waits for `M0-O1`.

**R-15 - What "smooth" means for the data table (from M1-W3).** Every interaction (scroll, sort, filter, selection) responds within 200 ms at 4x CPU slowdown in a Chromium profile, and scrolling never shows blank rows for more than one frame. The agent cannot measure this without a browser; it is checked on the Owner's real low-end phone in `M1-O4`. Accepted as is for now so `M1-W4` could start.

**R-16 - Stand-ins in the platform helper test (from M1-A1).** `supabase/tests/plat/020_helpers.test.sql` uses temporary stand-in tables for `teacher_assignments`, `students`, `guardians` and `student_guardians` until the real tables exist. Each ACAD task that creates a real table replaces its stand-in in that file (the file is now an allowed extra for every ACAD task). Rules: change only what the real table replaces; never weaken or delete an assertion; adjust `plan(N)`. `M1-A1` does `teacher_assignments`, `M1-A2` the other three. The agent's report on `M1-A1` was right to stop.

**R-17 - Academic nav link (from M1-A1).** The academic screens are reachable from the menu for admin, teacher and accountant. The shell test now finds the home link by name instead of assuming a single link, so feature nav items no longer break it. Guardian read policies on the academic tables go with `M1-A2`; registry entries go with `M1-Q1`.
