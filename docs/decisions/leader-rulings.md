# Leader rulings

Decisions the Leader (Claude) made in answer to questions raised in agent reports. Newest last. An Owner decision overrides any ruling here.

## Batch 1 (after the reports of M0-S2, M0-W1, M1-U3, M2-D1, M3-D1)

**R-01 — Result-engine assumptions (from M2-D1).** Grade from the *rounded* GPA, subject grades from the exact percent, and the absent-handling rule (`all_absent`) are accepted as written in `packages/domain/src/results/`. They are provisional: verify them against the real marksheets and grading rules collected in `M0-O1`; a difference becomes a change request on `M2-D1`, not a silent edit. The output shapes `SubjectResult` and `OverallResult`, the snapshot checksum and the error codes documented in the TSDoc of `packages/domain/src/results/` are now the contract for `M2-D2`, `M2-E3` and `M2-E4` (see `docs/spec/results-engine.md` section 8).

**R-02 — Fee-logic assumptions (from M3-D1).** Waiver combination (in list order, each on the amount still payable), `once` and `per_exam` billing only by explicit item id, `term` and `months` handling, and aging day 0 are accepted provisionally. Confirm with the pilot answers to the questions in `docs/spec/fees-and-alerts.md` section 8 before `M3-F2`.

**R-03 — Default Bangla alert texts (from M3-D1).** The renderer and `countSegments` are ready; the four default texts (`absent_alert`, `fee_due`, `result_published`, `notice`) are now part of `M3-T2`.

**R-04 — Attendance control width (from M1-U3).** No exception to the 44 px rule. The attendance row defaults to Present and shows two controls, Present and Absent, plus a "more" button that opens a bottom sheet (Late, Leave, note). Every control is at least 44x44 CSS px with 8 px between controls; names wrap instead of controls shrinking. Applies to `M2-A5` and to the final prototypes.

**R-05 — Sync conflict policy (from M0-S2).** D-06 is confirmed with the spike's two additions: last-write-wins by delivery order (never by client clock), and the iOS storage-eviction risk (the queue can be deleted silently; sync on app open and on returning to the foreground, and show Pending counts). Additionally: attendance gets an append-only audit table like marks; when a row was changed by someone else after the user loaded it, the UI shows who and when; a rejected op is terminal and its Error state always offers retry, discard, or edit and re-queue. Applies to `M2-P4`, `M2-E2`, `M2-A5`.

**R-06 — App shell (from M0-W1).** Accepted as Partial. The real-device keyboard check is done by the Owner on the Owner's own phones (a low-end Android; an iPhone if possible) during `M1-O4`, and again in `M2-Q3`; it is not an agent task. Lab LCP of 2.1 to 2.4 s in the Playwright proxy and 2.9 s in Lighthouse's simulation is accepted for the shell for now; the field target stays 2.5 s at the 75th percentile. Follow-up is in `M1-W5`: lazy-load route groups and heavy dialog and toast code. The correct ADR for the performance budget is 0005 (0004 is fonts).

**R-07 — CI (from M1-D1, M0-S2, M2-D1, M3-D1).** Root cause of the Actions minutes exhaustion found by M0-S2: the E2E web-server command left an orphan process, so runs hung for hours (about 1,850 billable minutes). Fixed on `main`: `exec` vite directly, `timeout-minutes` on jobs and on the E2E step. `ci / db` now publishes the freshly generated `packages/db/src/types.ts` on branch `bot/db-types` when it detects drift on a push, so it can be merged without running Docker.

**R-08 — Open item for the Owner.** A Cloudflare Pages project (`mms-munshee`) is connected to this repository and its build fails on every push. Either disconnect it, or set it up for this monorepo: root directory empty, build command `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @sms/web build`, output directory `apps/web/dist`, Node version from `.nvmrc`. The deployment task `M0-P3` names Netlify; the host is the Owner's choice.
