# SMS — School Management System (working title)

> **Plan v0.8** · 2026-09-20 · Leader: Claude · Owner: the founder (human)
> This file is the single source of truth for scope, decisions, task split and status.
> **Single-writer rule:** only the Leader edits `README.md`. Agents never edit it; they add a report under `docs/reports/` (§4).
> **Naming:** in this repo *SMS* means School Management System. Mobile text messages are called *text alerts*.

---

## 0. সারসংক্ষেপ (মালিকের জন্য)

- এটা Munshi থেকে **সম্পূর্ণ আলাদা** প্রোডাক্ট: মাল্টি-ইউজার, ক্লাউড-ভিত্তিক, ব্যবসার উদ্দেশ্যে। Munshi ফ্রি ও অপরিবর্তিত থাকবে; যাদের Munshi-তে আর কুলাবে না, তারা ডেটা ইম্পোর্ট করে SMS-এ আসতে পারবে (`M2-I1`)।
- কাজের চক্র: Leader (Claude) টাস্ক লেখে → আপনি টাস্কটা এজেন্টকে দেন → এজেন্ট নিজের ব্রাঞ্চে কাজ করে `docs/reports/`-এ রিপোর্ট লেখে → আপনি রিপোর্টটা Leader-কে দেন → Leader রিভিউ করে §6-এর বোর্ড আপডেট করে ও পরের টাস্ক দেয়।
- Leader নতুন সেশনে আগের চ্যাট মনে রাখতে পারবে না; তার আসল স্মৃতি এই রিপোজিটরি। **প্রতিটি Leader সেশনের শুরুতে এই README আর নতুন রিপোর্টগুলো পেস্ট করুন।**
- প্রতিটা টাস্কের আলাদা ব্রিফ ফাইল `docs/tasks/<ID>.md`-এ আছে। সব টাস্কের তালিকা, নির্ভরতা আর কোনগুলো একসাথে চালানো যায় (Wave) তা `docs/tasks/INDEX.md`-এ।
- UX: SMS-এর ফ্লো Munshi থেকে আলাদা (রোল ও কাজ-ভিত্তিক), তবে Munshi-র ডিজাইন ভাষা আর শেখা নিয়মগুলো থাকবে। আন্তর্জাতিক স্ট্যান্ডার্ড (WCAG 2.2 AA, ISO 9241, Nielsen) বাঁধা আছে `docs/spec/ux-standard.md`-এ; গবেষণা `docs/research/`-এ।
- মোবাইল: যেকোনো প্রতিষ্ঠান সব কাজ শুধু ফোনে, ঝামেলা ছাড়া করতে পারবে; ল্যাপটপ লাগবে না (D-16)। কীভাবে নিশ্চিত হবে: `docs/spec/mobile-complete.md`।
- এখন আপনার করণীয়: (১) §2-এর ডিসিশন কনফার্ম বা ওভাররাইড করুন; (২) এজেন্টকে শুধু বলুন `follow docs/tasks/<টাস্ক-নম্বর>.md`, আর কিছু না; (৩) §6-এ `READY` চিহ্নিত M0-এর প্রথম ব্যাচ শুরু করুন; যতগুলো টাস্কের শর্ত শেষ (`docs/tasks/INDEX.md`-এর Wave), ততগুলো একসাথে চালাতে পারেন; রিপোর্ট জমলে ব্যাচে আমাকে দিন (§4.4)।

---

## 1. Product

### 1.1 What and for whom

A Bangla-first, mobile-first, multi-user school management system for small and mid-size schools, madrasas and coaching centres in Bangladesh (assumption **A1**: roughly 50–1,000 students; confirm in the M0 interviews). It is for institutions that outgrow a single-device tool: several staff, parents who want visibility, shared data and audit trails.

### 1.2 v1 scope

| Milestone | In scope |
|---|---|
| M1 | Institutions, users and roles; academic years, classes, sections, subjects; students and guardians; bulk import; year rollover |
| M2 | Attendance; exams, marks entry, result engine, publishing, Bangla marksheets; Munshi importer; basic notices |
| M3 | Fees and receipts; text alerts (absent, dues, results); parent portal |
| M4 | Launch hardening: security review, backups, billing ops, docs, landing page |

**Non-goals for v1:** LMS or video classes, transport/GPS, biometric devices, payroll, AI features, native apps (PWA first), multi-country support, online payments (M5).

### 1.3 Relationship with Munshi

- Munshi stays a separate repo and product: free, offline-first, untouched by this project (bug fixes aside).
- No shared runtime code. Logic may be *ported* into `packages/domain` with parity tests against Munshi's outputs.
- `M2-I1` (Munshi importer) is the upgrade bridge for institutions that outgrow Munshi.
- Optional, the Owner's call and outside this repo: an opt-in "interested in SMS?" link inside Munshi to build the pilot list. No analytics or tracking, so Munshi keeps its "data stays on the device" promise.
- UX relationship: SMS keeps Munshi's design language and its proven interaction rules, but not its Year → Class → Form navigation or its free-form form builder. SMS is role- and task-based. See `docs/research/munshi-flow-analysis.md` and `docs/spec/ux-standard.md`.

### 1.4 Mobile-complete

Any institution must be able to run everything on phones alone, comfortably and without a laptop (Owner requirement, D-16). Android first (about 91% of mobile use in Bangladesh in August 2026, per StatCounter), iPhone second. Tablets and desktops are enhancements. The binding detail, the task matrix and the acceptance test are in `docs/spec/mobile-complete.md`.

---

## 2. Decisions

`PROPOSED` = the default is in force until the Owner overrides it. `OPEN` = needs input before dependent work starts.

| ID | Decision | Default / recommendation | Decider | Status |
|---|---|---|---|---|
| D-01 | Product name and brand | Not chosen; use "SMS" internally | Owner | OPEN |
| D-02 | Backend platform | **Supabase** (Postgres, Auth, RLS, Storage, Edge Functions). Alternative: Firebase (already used for other Mumtahin apps), but this data is relational and report-heavy and per-read pricing is a risk | Owner | PROPOSED |
| D-03 | Language and frontend | TypeScript (strict); React 19 + Vite + Tailwind + shadcn/Radix (same family as Munshi); pnpm monorepo; Netlify hosting unless `M0-P3` finds a reason to change | Owner | PROPOSED |
| D-04 | Multi-tenancy | One shared database; every tenant row carries `institution_id`; isolation enforced by Postgres RLS, not by app code | Leader | PROPOSED |
| D-05 | Auth in v1 | Admin-provisioned accounts; sign in with phone number or username plus password; guardians join by invite link. OTP and self-serve signup come later (they add gateway cost and dependency) | Owner | PROPOSED |
| D-06 | Offline scope | Online-first PWA. Offline queue only for attendance and marks entry (idempotent, client-generated IDs). No full offline replica in v1 | Leader | PROPOSED |
| D-07 | Result rules | Config-driven engine (grade-scheme presets plus custom rules), not hard-coded to one board. Published results are immutable snapshots | Leader | PROPOSED |
| D-08 | Text-alert provider | Behind an adapter interface; per-institution credit ledger; provider chosen after `M0-R2` | Owner | OPEN |
| D-09 | Payments | v1: manual fee entry and receipts. Online payments in M5 | Owner | PROPOSED |
| D-10 | Hosting region | Closest available region to Bangladesh; separate staging and production | Leader | PROPOSED |
| D-11 | Pricing model | Decide from pilot evidence; no billing engine before then (manual subscription flag only) | Owner | OPEN |
| D-12 | Bangla PDF approach | Decided by spike `M0-S1` (print CSS vs headless Chromium) | Leader | OPEN |
| D-13 | Repository | New private repo; Munshi repo untouched | Owner | PROPOSED |
| D-14 | UX standard and process | ISO 9241-210 process (interviews, flows, prototypes, user tests, pilot evaluation); WCAG 2.2 AA; Nielsen heuristics as review checklist; Core Web Vitals targets; `docs/spec/ux-standard.md` is binding | Owner | PROPOSED |
| D-15 | Flow relative to Munshi | Different flow (role- and task-based, subject-wise marks grid, exam wizard), same design language and interaction rules; see `docs/research/munshi-flow-analysis.md` | Owner | PROPOSED |
| D-16 | Mobile-complete | Every task in every role can be done on a phone alone, comfortably, with no laptop. Android first, iPhone second; tablets and desktops are enhancements. `docs/spec/mobile-complete.md` is binding; acceptance is a phone-only run of the whole journey (`M2-Q3`) | Owner | CONFIRMED |
| D-17 | Where official results are computed | On the server only: Edge Functions import `@sms/domain` for preview and publish; clients display results and never compute official numbers | Leader | PROPOSED |
| D-18 | Text alert policy | Alerts only to guardians who allow them and have a valid phone; quiet hours 21:00–07:00 Asia/Dhaka; dedupe; credits reserved before sending; bulk sends show segments and cost first; teachers cannot send free-form messages in v1 (`docs/spec/fees-and-alerts.md` §5) | Owner | PROPOSED |
| D-19 | Fee records | Append-only: voids with a reason, never edits or deletes; receipt and invoice numbers sequential per institution per year; no late fees in v1; no card data stored (`docs/spec/fees-and-alerts.md` §1–3) | Owner | PROPOSED |

---

## 3. Architecture (proposal)

### 3.1 Repo layout

```text
apps/
  web/              # staff + guardian PWA (role-based routes); platform console starts as a route group
  landing/          # marketing site (M4)
packages/
  domain/           # pure TypeScript business logic: results, grades, ranking, fees, money, dates (no I/O)
  db/               # generated database types and typed helpers
  ui/               # design-system components
  config/           # tsconfig, lint and format presets
supabase/
  migrations/       # forward-only SQL
  functions/        # Edge Functions: text-alert worker, importers, PDF jobs if needed
  tests/            # pgTAP tests, including RLS tests
  seed/             # dev seed and demo tenant
e2e/                # Playwright
spikes/             # throwaway spikes (M0-S1, M0-S2), excluded from CI
docs/
  spec/  tasks/  reports/  research/  samples/  help/  decisions/  runbooks/
```

### 3.2 Security and tenancy rules (non-negotiable)

1. Every tenant table has a non-null `institution_id`. Cross-table references use composite keys where needed so a row can never point into another tenant.
2. RLS is enabled on every table; default deny. Policies call shared helper functions (`SECURITY DEFINER`, one place to audit) such as `has_role(institution_id, roles)`.
3. The service-role key exists only in server-side code (Edge Functions, CI), never in the client bundle.
4. Every policy has tests: allowed role passes, other role fails, other tenant fails. CI blocks merges when RLS tests fail.
5. `audit_log` is append-only and records marks edits, result publish/unpublish, payments and refunds, role changes and impersonation.
6. Minimum PII: collect only what a feature needs. Files live under tenant-scoped storage paths and are served by short-lived signed URLs.
7. Daily backups. A restore drill is required before the pilot (M3) and before launch (M4).

### 3.3 Conventions

- **Config over code:** class levels, subjects, grade schemes, fee heads and working days are data, never enums. Schools, madrasas and coaching centres differ.
- **Locale:** Bangla default, English secondary. Digits are stored as ASCII and shown as Bangla or English by user setting.
- **Time:** store `timestamptz` and `date`; display in Asia/Dhaka. Weekly holidays and academic-year start are per-institution settings (do not assume Jan–Dec or a Friday-only weekend). Some madrasas run on the Hijri calendar: confirm in the M0 interviews whether Hijri dates or Hijri academic years are needed, and keep date handling open to adding them.
- **Money:** integer minor units (poisha). Never floats.
- **Phones:** normalise to E.164 (`+8801XXXXXXXXX`); validate Bangladeshi mobile formats.
- **Names:** Bangla, English and Arabic script; never assume surname order.
- **IDs:** UUIDs; rows created offline get client-generated IDs.
- **Results:** computed by `packages/domain`. Publishing freezes an immutable snapshot so later rule changes never alter official results.
- **Performance:** target low-end Android on slow networks. Bundle and interaction budgets are set in `M0-W1` and enforced in CI.
- **UX:** `docs/spec/ux-standard.md` is binding for every screen: WCAG 2.2 AA, Bangla first, mobile first, primary actions always visible, 44 px targets.
- **Mobile-complete:** every task works on a phone alone (`docs/spec/mobile-complete.md`): touch only, no drag or hover dependence, least typing, files and photos from the phone, outputs by share sheet or download, the on-screen keyboard never hides the focused field.

### 3.4 Roles (draft; the permission matrix comes with `M0-L1`)

| Role | Can | Cannot |
|---|---|---|
| Platform Owner | Manage tenants, plans, text credits; support access via audited, time-limited impersonation | Read tenant data without an audit trail |
| Institution Admin | Everything inside their institution: users, setup, students, exams, publish results, fees | Touch other institutions |
| Teacher | Assigned classes and subjects: attendance, marks entry, view students | Fees, publishing, user management |
| Accountant | Fees, receipts, dues; read-only students | Marks, attendance edits |
| Guardian | Read-only, own children only: attendance, published results, dues, notices | Anything else |
| Student (later) | Read-only, self | Anything else |

### 3.5 Domain model, first cut (Leader finalises in `M0-L1`)

- **Tenancy and people:** `institutions`, `institution_settings`, `profiles`, `memberships`, `audit_log`
- **Academic:** `academic_years`, `class_levels`, `sections`, `subjects`, `class_subjects`, `teacher_assignments`
- **Students:** `students`, `guardians`, `student_guardians`, `enrollments`
- **Attendance:** `attendance_sessions`, `attendance_records` (daily in v1; keep an optional period field)
- **Exams:** `grade_schemes`, `exams`, `exam_subjects`, `exam_components`, `marks`, `result_snapshots`, `result_rows`
- **Fees:** `fee_heads`, `fee_plans`, `fee_plan_items`, `invoices`, `invoice_items`, `payments`, `waivers`
- **Comms:** `notices`, `notice_audiences`, `text_templates`, `text_outbox`, `text_credit_ledger`
- **Platform:** `plans`, `institution_subscriptions`, `import_jobs`

---

## 4. How we work (Leader and agents)

### 4.1 Who does what

- **Owner (human):** decides, relays briefs and reports, merges PRs, runs interviews, pilots, legal and money matters.
- **Leader (Claude):** plans, writes specs and briefs, reviews reports and any diffs the Owner shares, spots design and security problems, keeps this file and the board current.
- **Agents:** implement one task at a time inside the paths their workstream owns.
- **CI:** the final arbiter. The Leader cannot run code, cannot watch agents in real time, does not remember earlier chats and sees the repo only through what the Owner pastes or shares. Leader approval never replaces failing tests.

### 4.2 The loop

1. Leader writes `docs/tasks/<ID>.md` and the task becomes `BRIEFED`.
2. Owner tells the agent only `follow docs/tasks/<ID>.md`; the task becomes `IN PROGRESS`. The task file is a self-contained runbook.
3. Agent works on its branch, opens a PR, writes `docs/reports/<ID>.md`; the task becomes `REVIEW`.
4. Owner gives the report to the Leader, with the PR link or with `git diff --stat` and the key files if the Leader has no repo access.
5. Leader returns a verdict: **Accepted** (Owner merges), **Changes requested** (numbered list) or **Blocked** (a decision is needed). Leader updates §6 and issues the next briefs.

**Starting an agent:** tell it only `follow docs/tasks/<ID>.md`. The task file is a self-contained runbook: what to read, preflight checks, steps, boundaries, verification, self-review, a pre-filled report and what to do when blocked. The agent ends with a short Bangla message for the Owner (`✅ <ID> শেষ` or `⛔ <ID> আটকে গেছে`).

**Leader session opener (paste to the Leader):**

```text
Leader session. README.md is pasted below.
New reports since the last session: <paste them, or list the IDs>
Decisions I made since then: <...>
Today I want: <review reports / next briefs / decide something>
```

### 4.3 Rules for agents

1. Your task file (`docs/tasks/<ID>.md`) is the only instruction; it tells you what to read and what to do.
2. One task = one branch `agent/<TASK-ID>` = one PR. Rebase on `main` before opening the PR. Keep PRs small.
3. Touch only the paths your workstream owns (§5). If you need a change elsewhere, list it under "Requests" in your report; do not make it yourself.
4. Contracts first. Schema, generated types and shared package APIs change only through the task that owns them. Never edit an applied migration; add a new one. Feature workstreams may add migration files only for their own tables, named `YYYYMMDDHHMM_<ws>_<desc>.sql`.
5. Every table has RLS, and every policy has tests (allowed role, other role, other tenant).
6. Business logic lives in `packages/domain` as pure functions with unit tests. UI code calls it and never re-implements it.
7. All user-visible text goes through i18n keys (Bangla first, English second). Store digits as ASCII; convert for display only.
8. No secrets in the repo, logs, reports or chat. Use `.env.example` and the platform's secret store.
9. Do not invent requirements. If the brief is ambiguous, state your assumption in the report; if it blocks you, stop and report `BLOCKED`.
10. No drive-by refactors and no dependency upgrades outside your task.
11. Evidence over claims: paste the exact commands you ran and their results into the report. CI must be green.
12. Mobile first: design for 360 px width, low-end Android and slow networks. Every list has loading, empty and error states.
13. Stop when the acceptance criteria are met. Do not start the next task without a new brief.

### 4.4 Task briefs and statuses

Every agent task file `docs/tasks/<ID>.md` is a self-contained runbook (mission · ground rules · preflight checks · steps · boundaries · verification · self-review · report skeleton · finish and BLOCKED procedures), generated from one source so dependencies and waves stay consistent. Shared details are in `docs/AGENT-PROTOCOL.md`. The Owner asked for the full plan to be written before execution starts; briefs are refreshed whenever a spec or decision changes. `docs/tasks/INDEX.md` lists every task with its dependencies and wave.

- **Sizes:** S ≈ half a session, M ≈ one session, L = must be split before it is briefed. (Owner tasks are sized by calendar effort.)
- **Statuses:** `TODO` → `READY` (no unmet dependency) → `BRIEFED` → `IN PROGRESS` → `REVIEW` → `DONE`; side states `CHANGES` and `BLOCKED`.
- **Parallelism:** run every task whose dependencies are `DONE`, with as many agents as the Owner has. Path ownership (§5) keeps agents apart and `docs/tasks/INDEX.md` shows the waves. The limit is review capacity: reports are reviewed in batches and acceptance criteria are machine-checkable so reviews stay short. If reviews pile up, pause new briefs, not reviews.

---

## 5. Workstreams and ownership

| Code | Workstream | Owns (paths) |
|---|---|---|
| WS-L | Leader | `README.md`, `docs/tasks/**`, `docs/spec/**`, `docs/decisions/**` |
| WS-PLAT | Platform, infra, DB, auth | `supabase/**` (pipeline, core tables, functions), `packages/db/**`, `packages/config/**`, `.github/**`, root configs |
| WS-DOM | Domain engine | `packages/domain/**` |
| WS-WEB | App shell, design system, offline infra | `apps/web/src/app/**`, `apps/web/src/shared/**`, `packages/ui/**`, `spikes/offline/**`, app-level files (`apps/web/src/main.tsx`, `apps/web/index.html`, `apps/web/public/**`, `apps/web/scripts/**`, Vite, Tailwind and PostCSS config) |
| WS-ACAD | Academic structure, students, attendance | `apps/web/src/features/{academic,students,attendance}/**` and their own migrations |
| WS-EXAM | Exams, results, printing, Munshi importer | `apps/web/src/features/{exams,results,print,importers}/**`, their own migrations, `spikes/pdf/**` (throwaway, not in CI), `supabase/functions/{results-*,marksheets-*,munshi-import}/**`, `packages/pdf/**` |
| WS-FIN | Fees and accounts | `apps/web/src/features/fees/**` and its own migrations, `supabase/functions/fees-*/**`, `packages/pdf/src/templates/fees/**` |
| WS-COMM | Text alerts, notices, parent portal | `apps/web/src/features/{notices,parent,alerts}/**`, `supabase/functions/alerts/**` and their own migrations |
| WS-QA | E2E, security and performance tests | `e2e/**`, `supabase/tests/rls-registry.json`, `supabase/tests/rls/**`, `scripts/rls/**`, `.github/workflows/qa-*.yml` |
| WS-GTM | Help docs, demo data, landing site | `docs/help/**`, `apps/landing/**`, `supabase/seed/demo/**` |
| WS-RES | Research (no product code) | `docs/research/**` |
| WS-UX | UX research, flows, design system, prototypes | `docs/spec/ux-flows.md`, `docs/spec/design-system.md`, `docs/spec/design-tokens.json`, `docs/spec/content-guide.md`, `docs/spec/screens/**`, `prototypes/**` (static, not in CI), `docs/research/usability-*.md` |
| WS-OWN | Owner (human) | Interviews, pilots, legal, business, credentials |

**Allowances for every code workstream** (each task file lists its exact globs; its self-check enforces them): its own workflow files `.github/workflows/<ws>-*.yml`; ADRs in `docs/decisions/`, runbooks in `docs/runbooks/`, research notes in `docs/research/` (new files only); `package.json` dependency additions the task needs (listed in its report); regenerated `packages/db/src/types.ts` when it adds migrations; typed wrappers in `packages/db/src/<ws>/`; e2e tests of its own features in `e2e/<ws>/`; seeds in `supabase/seed/<ws>/`; entries in `docs/spec/rls-patterns.md`. Features are picked up by the shell through `apps/web/src/features/*/register.ts`, so no feature edits shell files.

---

## 6. Roadmap and board

Each task has a brief in `docs/tasks/<ID>.md`; `docs/tasks/INDEX.md` gives dependencies and waves. **Planning status:** complete. Briefs exist for every scheduled task in M0 to M4, and M5 is a demand-gated backlog of provisional briefs. Specs: domain model, permissions, results engine, fees and alerts, UX, mobile. The plan will change after the interviews (`M0-O1`) and the pilots (`M3-P2`).

### M0 — Foundation and validation

**Goal:** decisions closed, a deployed walking skeleton, and real evidence of what institutions need.
**Exit criteria:** D-02 to D-07 confirmed and D-08, D-12 decided · walking skeleton on staging with CI green and auto-deploy from `main` · 8+ institution interviews summarised and 10+ anonymised real samples in `docs/samples/` · provider shortlist, running-cost model and privacy checklist delivered · role journeys, screen inventory and design system spec delivered · Leader publishes a first timeline estimate from measured agent throughput.

| ID | WS | Task | Needs | Size | Status |
|---|---|---|---|---|---|
| M0-L1 | L | Domain and data-model spec v0: entities, relations, permission matrix, module boundaries (written in `docs/spec/`) | Owner confirms D-02..D-07 (defaults assumed) | M | DONE |
| M0-O0 | OWN | Repo and accounts: private repo, Supabase staging project, Netlify, 2FA, business email, branch protection, Munshi source files copied into `docs/samples/munshi/` | — | S | READY |
| M0-O1 | OWN | Interview 8–10 schools, madrasas and coaching centres; collect anonymised samples (marksheets, fee registers, attendance registers, admit cards) into `docs/samples/`. Also record per institution: exam calendar (term dates; Gregorian or Hijri year), who enters marks, what software or registers they use now, and what they pay or would pay. Never commit real student names or IDs | M0-R1 guide (soft) | L | READY |
| M0-O2 | OWN | Business and legal basics: trade-licence/entity status, lawyer for terms and privacy policy, start sender-ID and merchant applications once providers are chosen | M0-R2, M0-R3 | M | TODO |
| M0-R1 | RES | Interview guide (Bangla) and competitor teardown: Bangladeshi and open-source/global products; features, pricing, onboarding, weaknesses. Every claim sourced and dated | — | M | READY |
| M0-R2 | RES | Provider options for text alerts and payments in Bangladesh: pricing, API, sender-ID process and lead time, delivery reports, merchant requirements. Shortlist and recommendation, plus a monthly running-cost model (hosting, storage, text alerts, payment fees) for 10, 50 and 200 institutions | — | M | READY |
| M0-R3 | RES | Student-data privacy and compliance checklist for Bangladesh (input for a lawyer; not legal advice) | — | S | READY |
| M0-U1 | UX | Information architecture, role journeys and screen inventory (`docs/spec/ux-flows.md`) | — (soft: M0-O1, M0-R1) | M | READY |
| M0-U2 | UX | Design system spec v0: tokens, Bangla typography, components, content guide | M0-U1 | M | TODO |
| M0-P1 | PLAT | Monorepo scaffold: pnpm workspaces, strict TS, lint/format, Vitest, Playwright skeleton, GitHub Actions CI, `.env.example`, `AGENTS.md` and `CLAUDE.md` pointing to this README, PR template with report checklist | M0-O0 | M | TODO |
| M0-P2 | PLAT | Supabase local and staging; CI applies migrations from scratch and runs SQL tests; seed strategy; secrets doc; generated types into `packages/db` | M0-P1 (soft: M0-O0) | M | TODO |
| M0-W1 | WEB | App shell: routing, role-aware navigation, design tokens from the UX design system, Bangla-first i18n, Bangla-digit helper, PWA baseline, loading/empty/error patterns, licence-checked Bangla web font, bundle budget | M0-P1, M0-U2 | M | TODO |
| M0-P3 | PLAT | Walking skeleton on staging: sign in, pick institution, hello dashboard; auto-deploy from `main` | M0-P2, M0-W1, M0-O0 | M | TODO |
| M0-S1 | EXAM | Spike: Bangla marksheet PDF. Compare print CSS with headless Chromium on 3 real layouts and a 100-student batch; test on a real low-end Android and an iPhone (generate, view, share, print); recommend with cost and failure modes (decides D-12) | M0-P1 (soft: M0-O1) | M | TODO |
| M0-S2 | WEB | Spike: offline queue for attendance and marks (Dexie, idempotent sync, conflict policy, visible sync status); recommend and prototype (confirms D-06) | M0-P2 | M | TODO |

### M1 — Platform core

**Goal:** a multi-tenant foundation with people and academic structure.
**Exit criteria:** automated tests prove one institution can never read or write another's data, for every table · the Owner creates an institution, configures a year and imports 1,000 students without help · a 1,000-row import finishes in under 30 s on staging · usability tests on the five critical flows completed and findings applied · CI green and Leader review of M1 done.

| ID | WS | Task | Needs | Size | Status |
|---|---|---|---|---|---|
| M1-L1 | L | Exam and result engine spec plus golden-test plan (rules, rounding, ties, optional subjects), written in `docs/spec/results-engine.md`, refined when M0-O1 samples arrive | M0-L1 (soft: M0-O1) | M | DONE |
| M1-P1 | PLAT | Core schema and RLS: institutions, profiles, memberships and roles, audit_log, helper functions; cross-tenant negative tests, a reusable RLS test harness and tenant-scoped storage buckets | M0-P3 | M | TODO |
| M1-P2 | PLAT | Auth per D-05: admin-provisioned users, phone or username sign-in, invites, admin-assisted password reset, rate limiting | M1-P1 | M | TODO |
| M1-P3 | PLAT | Platform tables and RPCs: tenants, plan flags, text-credit ledger skeleton, time-limited audited support impersonation | M1-P1 | M | TODO |
| M1-W2 | WEB | Platform console, institution settings and user-management UI | M1-P2, M1-P3, M1-W3 | M | TODO |
| M1-W3 | WEB | Shared data table (virtualised, sort/filter, mobile card mode), form patterns, print-layout base, file upload | M0-W1 | M | TODO |
| M1-D1 | DOM | Domain foundations: money, Dhaka dates and academic-year helpers, phone normalisation, Bangla digits, name utilities; test harness | M0-P1 | S | TODO |
| M1-A1 | ACAD | Academic structure: years, class levels (data-driven), sections, subjects, class-subjects, teacher assignments, working-days settings | M1-P1, M1-W3, M1-D1 | M | TODO |
| M1-A2 | ACAD | Students and guardians: profile, guardians, structured address, enrolment per year with roll, quick add on phones, search and filter, archive | M1-A1 | M | TODO |
| M1-A3 | ACAD | Bulk import (CSV/XLSX and pasted lists, phone friendly): preview, validate, commit; Bangla header mapping, dedupe, downloadable error report | M1-A2, M1-U4 | M | TODO |
| M1-A4 | ACAD | Year rollover: carry students forward with promote/hold/leave per student | M1-A2 | S | TODO |
| M1-Q1 | QA | E2E harness with two seeded institutions; RLS suite wired into CI; smoke flows (sign in, create student, import); axe accessibility gate | M1-P1 (soft: M0-P3) | M | TODO |
| M1-W4 | WEB | EntryGrid: keyboard-first editable grid for marks and fee entry (phone mode, sticky header, save states) | M1-W3 | M | TODO |
| M1-W5 | WEB | Role homes, home widget registry and setup checklist | M1-W3, M1-U4 | M | TODO |
| M1-U3 | UX | Clickable prototypes and usability test plan for five critical flows (attendance, marks grid, publish and print, import, guardian view) | M0-U2 (soft: M0-O1) | M | TODO |
| M1-O4 | OWN | Usability tests with 5–8 real users on the prototypes; scoresheets and a one-page summary | M1-U3 | M | TODO |
| M1-U4 | UX | Prototype revision and screen specs (hand-off to feature tasks) | M1-O4 | S | TODO |

### M2 — Sellable MVP

**Goal:** one institution runs a full exam cycle and daily attendance on its real data.
**Exit criteria:** a pilot institution completes setup → marks → results → printed marksheets on staging with its own data · golden tests pass for 5+ real marksheet formats · attendance used daily for 2 weeks by 1+ institution on staging · no open P1 bugs · the whole journey completes on phones only, with no laptop step (`M2-Q3`) · CI green and Leader review of M2 done.

| ID | WS | Task | Needs | Size | Status |
|---|---|---|---|---|---|
| M2-D1 | DOM | Result engine core: grade schemes (percentage ranges, GPA-style, custom), component-based subject marks (written/MCQ/practical/CT), pass rules, optional-subject rule, weighted totals, rounding; unit and golden tests | M1-L1, M1-D1 (soft: M0-O1) | M | TODO |
| M2-D2 | DOM | Ranking and tie-break rules, class and subject analytics, grade distribution; parity tests against Munshi outputs on shared fixtures (differences documented) | M2-D1 | M | TODO |
| M2-P4 | PLAT | Production sync RPC `apply_ops` (idempotent batches for attendance and marks) and client wrapper, from the `M0-S2` spike | M0-S2, M1-P1 | M | TODO |
| M2-E1 | EXAM | Exam setup: terms and exams, exam subjects with components and full/pass marks, grade-scheme editor with presets, exam lock states | M1-A1, M2-D1, M1-U4 | M | TODO |
| M2-E2 | EXAM | Marks entry: keyboard and mobile grid, validation, absent/exempt codes, offline queue (per `M0-S2`), edit history via audit, lock/unlock | M2-E1, M2-P4, M1-W4, M1-U4, M1-W5 | M | TODO |
| M2-E3 | EXAM | Results: compute preview, tabulation sheet, publish as immutable snapshot, unpublish and re-publish with versioning and audit | M2-E2, M2-D2, M1-U4, M1-W5 | M | TODO |
| M2-E4 | EXAM | Marksheet and transcript templates in Bangla per D-12: single and batch, institution header/footer/signatures, CSV/XLSX export of the tabulation sheet, share or print from a phone (share sheet with PDF, download fallback) | M2-E3, M0-S1 (soft: M0-O1) | M | TODO |
| M2-A5 | ACAD | Attendance: fast daily marking on mobile, offline queue, corrections with history, monthly summary, absentee list, working-day aware | M1-A2, M2-P4, M1-U4, M1-W5 | M | TODO |
| M2-I1 | EXAM | Munshi importer: parse a Munshi backup file, map Year/Class/Roster/Forms/Responses to SMS entities; dry-run report, idempotent re-run, fidelity tests on anonymised real backups | M1-A3, M2-E1, M2-D2 | M | TODO |
| M2-C1 | COMM | Notices v0: create, publish and list by audience (all, class, role) with a simple read view | M1-P1, M1-W3 | S | TODO |
| M2-Q2 | QA | E2E for the full exam cycle; low-end Android performance pass; accessibility sweep; RLS re-check for new tables; phone-only acceptance kit | M2-E4, M2-A5, M1-Q1, M1-W2 | M | TODO |
| M2-Q3 | OWN | Phone-only acceptance on real devices (low-end Android and an iPhone): the whole journey from first sign-in to shared marksheets, with a hassle log; a laptop-only step is a defect | M2-Q2 | M | TODO |
| M2-G1 | GTM | Demo tenant seeder (realistic Bangla data, two institutions) and the first 10 help articles | M2-E3, M0-U2 | S | TODO |
| M2-O3 | OWN | Recruit 3–5 pilot institutions (ideally Munshi users), agree pilot terms, include pricing conversations. Time each pilot to the institution's real exam calendar; attendance and notices can start before an exam window. Can start during M1 | — | M | READY |

### M3 — Pilot and revenue features

**Goal:** real institutions use the product in production, and fees, text alerts and the guardian portal are proven with them.
**Exit criteria:** pilots live in production for a full month or term · fees, alerts and the guardian portal used by at least one pilot · zero data-loss or data-leak incidents · restore drill passed · top-10 pilot feedback items closed · evidence of willingness to pay (paying or committed institutions).

| ID | WS | Task | Needs | Size | Status |
|---|---|---|---|---|---|
| M3-L1 | L | Spec for fee tables and rules, alert tables and rules, guardian portal (`docs/spec/fees-and-alerts.md`) | M0-L1 | M | DONE |
| M3-D1 | DOM | Waiver math, payment allocation, dues aging, numbering format, template rendering, SMS segment counter, quiet-hours scheduling | M3-L1, M1-D1 | M | TODO |
| M3-U1 | UX | Accountant, admin-alert and guardian flows; phone prototypes; usability test plan | M3-L1, M1-U4 | M | TODO |
| M3-O1 | OWN | Owner runs usability tests with accountants, admins and real guardians | M3-U1 | M | TODO |
| M3-U2 | UX | Turn M3 test findings into final screen specs | M3-O1 | S | TODO |
| M3-O0 | OWN | Owner creates production accounts, domain and monitoring account | — | S | READY |
| M3-F1 | FIN | Fee heads, class plans, student overrides and waivers, on a phone | M3-L1, M1-A1, M3-U2 | M | TODO |
| M3-F2 | FIN | Bulk invoice generation, numbering, waivers applied, dues lists and student ledger | M3-F1, M1-A2, M3-D1 | M | TODO |
| M3-F3 | FIN | Quick collect flow, allocations, receipt PDFs shared from a phone, voids, period locks | M3-F2, M2-E4 | M | TODO |
| M3-F4 | FIN | Collection and dues reports, defaulters, exports, accountant home widgets | M3-F3, M1-W5 | M | TODO |
| M3-T1 | COMM | Outbox state machine, provider adapter (chosen provider plus fake), worker with retries, credit reserve and refund | M3-D1, M1-P3, M0-R2 (soft: M0-O2) | M | TODO |
| M3-T2 | COMM | Bangla templates with cost preview, automatic triggers, bulk message, credits view | M3-T1, M2-A5, M2-E3, M3-F2, M3-U2 | M | TODO |
| M3-G1 | COMM | Invite acceptance, guardian shell with child switcher, language toggle, install guide | M1-P2, M3-U2, M1-W5 | M | TODO |
| M3-G2 | COMM | Read-only child views: attendance, published results with marksheet, dues and receipts, notices | M3-G1, M2-E4, M2-A5, M3-F3, M2-C1 | M | TODO |
| M3-P1 | GTM | Onboarding checklist, feedback tracker, triage rules, support playbook in Bangla | M2-G1 | S | TODO |
| M3-P3 | PLAT | Production project and pipeline, restore drill, monitoring and alerts, release checklist | M0-P3, M3-O0 | M | TODO |
| M3-Q1 | QA | E2E for fees, alerts and portal; RLS and a11y re-check; phone acceptance kit for M3 | M3-G2, M3-T2, M3-F4, M3-P3, M2-I1 | M | TODO |
| M3-P2 | OWN | Owner runs 3-5 pilot institutions in production for a month or term and collects evidence | M3-P1, M3-P3, M2-Q3, M2-O3 | L | TODO |

### M4 — Launch v1.0

**Goal:** open sales with security, operations, pricing, legal and support in place.
**Exit criteria:** security review findings closed · legal documents live in the app · pricing and billing operations ready · scale test passed · launch checklist complete · first paying customers onboarded with no founder hand-holding beyond an onboarding call.

| ID | WS | Task | Needs | Size | Status |
|---|---|---|---|---|---|
| M4-S1 | QA | RLS and function audit, Edge Function authorisation, headers and sessions, secrets and dependencies, retest | M3-Q1 | M | TODO |
| M4-S2 | PLAT | Institution data export, offboarding with grace period, erasure on request, retention rules | M3-P3, M0-R3 | M | TODO |
| M4-O1 | PLAT | Status page, incident runbook, usage and error dashboards, abuse controls | M3-P3 | M | TODO |
| M4-B0 | OWN | Owner decides pricing model and plans from pilot evidence (D-11) | M3-P2 (soft: M0-R1, M0-R2) | M | TODO |
| M4-B1 | PLAT | Plan limits, trial and grace flows, subscription invoices and payment records, renewal reminders | M4-B0, M1-P3 | M | TODO |
| M4-L1 | OWN | Owner gets Terms, Privacy Policy and consent wording reviewed by a lawyer | M0-O2 (soft: M3-P2) | M | TODO |
| M4-L2 | PLAT | Versioned consents, acceptance at first login and invite, public legal pages | M4-L1, M1-P2 | M | TODO |
| M4-W1 | GTM | Bangla mobile-first landing site with pricing, demo access and contact | M4-B0, M2-G1 | M | TODO |
| M4-W2 | GTM | Grow the help centre from real pilot questions and publish it on the landing site | M3-P2, M4-W1 | S | TODO |
| M4-Q1 | QA | Load test 50 institutions by 1,000 students; find and report bottlenecks and cost effects | M3-Q1, M1-A4 | M | TODO |
| M4-A1 | WEB | Optional Android store presence by wrapping the web app; needs a Play developer account | M4-L2 | S | TODO |
| M4-R1 | OWN | Owner signs off launch checklist and onboards the first paying customers | M4-S1, M4-S2, M4-O1, M4-B1, M4-L2, M4-W1, M4-W2, M4-Q1 | M | TODO |

### M5 — Growth (demand-gated backlog)

Rule: an item becomes `READY` only when at least two pilot or paying institutions ask for it, or it is needed to close a sale, and the Leader has refreshed its brief. The order is a starting guess, not a commitment.

| ID | WS | Item | Starts when | Size |
|---|---|---|---|---|
| M5-T1 | ACAD | Class timetable with teacher conflict detection | 2+ institutions ask for it | L |
| M5-D1 | EXAM | Admit cards and exam seat plans | 2+ institutions ask, or needed to close a sale | M |
| M5-D2 | EXAM | Student ID cards and certificates | 2+ institutions ask | M |
| M5-P1 | FIN | Online fee payment | Merchant account approved and 2+ institutions ask | L |
| M5-B1 | PLAT | Institutions with several branches | 1+ institution with branches wants to buy | L |
| M5-H1 | ACAD | Staff attendance and leave | 2+ institutions ask | M |
| M5-A1 | EXAM | Trends and comparisons | Pilots confirm they use the reports | M |
| M5-S1 | PLAT | Self-serve onboarding | Manual onboarding becomes the bottleneck | M |
| M5-X1 | ACAD | Migration importers | A sale is blocked by migration | M |
| M5-M1 | EXAM | Madrasa calendars and grading | Pilot madrasas need it (from M0-O1 findings) | L |
| M5-E1 | COMM | Homework and diary | 2+ institutions ask | M |
| M5-HS1 | FIN | Hostel and mess accounting | Pilot institutions with hostels ask | M |
| M5-MSG1 | COMM | WhatsApp messages to guardians | Approval obtained and cost beats text messages | L |
| M5-L1 | ACAD | Library management | 2+ institutions ask | M |
| M5-R1 | OWN | Referrals and resellers | Sales channel is the bottleneck | M |

---

## 7. Task log (Owner fills, optional)

| Task | Agent or tool used | Started | Result |
|---|---|---|---|
| _(e.g. M0-R1)_ | | | |
| | | | |

---

## 8. Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Scope creep into a giant SMS | Milestone exit criteria and non-goals; new ideas go to the M5 backlog, never into a running milestone |
| 2 | Cross-tenant data leak | RLS plus tests in CI; no service key in the client; security review in M4 |
| 3 | Result rules vary by institution | Config-driven engine; golden tests from 5+ real marksheet formats; pilots before scale |
| 4 | Bangla PDF quality | Spike `M0-S1` before committing; test on real samples |
| 5 | Text-alert and payment onboarding delays (sender ID, merchant approval) | Research in `M0-R2`; Owner starts applications early; adapter keeps the provider swappable |
| 6 | Offline sync conflicts | Narrow offline scope; idempotent operations; audit trail; lock after publish |
| 7 | Agent drift and inconsistent code | Contracts first, path ownership, single-writer README, CI gates, Leader review |
| 8 | Support burden on the founder | Help articles, in-app hints, onboarding runbook, limited pilot count; track support hours per institution |
| 9 | Student data privacy and legal exposure | Minimum PII, lawyer review (`M0-O2`), export/delete flows, encrypted backups |
| 10 | Willingness to pay unproven | Pricing conversations in `M2-O3`; M3 exit requires payment evidence |
| 11 | Platform cost and lock-in | Standard Postgres, cost dashboard, documented export, self-hosting possible later |
| 12 | Two codebases to maintain (Munshi and SMS) | Munshi frozen apart from bug fixes; importer only; no shared runtime code |
| 13 | Pilot timing misses the exam calendar | Capture exam calendars in `M0-O1`; pilot attendance and notices first; run the first exam-cycle pilot in the institution's next real exam window; Munshi keeps serving exams that arrive before M2 is ready |
| 14 | Phone-only institutions hit desktop-shaped jobs (import, bulk print, wide reports, complex editors) | `docs/spec/mobile-complete.md` task matrix, pasted-list import, server-made PDFs shared from the phone, phone list mode in `EntryGrid`, phone-only acceptance run `M2-Q3` |
| 15 | iPhone web-app limits (no Background Sync, push only when installed, weaker storage persistence) | Sync on open and on foreground, install guide, guardian alerts by text message not push, iPhone test pass |

---

## 9. Definition of done (every task)

- [ ] Every acceptance criterion is met, with evidence in the report.
- [ ] CI is green: lint, typecheck, unit tests; RLS tests for any schema change; E2E if a user flow changed.
- [ ] Migrations apply from scratch and are forward-only.
- [ ] No new secrets; no TODOs without a follow-up listed in the report.
- [ ] i18n complete (bn and en); works at 360 px; keyboard reachable; no console errors.
- [ ] Changed screens follow `docs/spec/ux-standard.md`: axe reports no serious or critical violations; contrast, 44 px targets, visible primary actions, non-colour status signals, no focus hidden behind sticky bars.
- [ ] Phone-complete: the feature works fully on a 360 px phone with touch only and the on-screen keyboard open (no hover, drag or laptop dependence); files, PDFs and shares are tested on Android Chrome, and on iPhone Safari where they apply.
- [ ] Docs updated wherever behaviour or contracts changed.
- [ ] Report submitted using Appendix A.

---

## Appendix A — Report template (`docs/reports/<TASK-ID>.md`; every runbook embeds a pre-filled copy)

```markdown
# Report — <TASK-ID> — <title>

**Status:** Done | Done with deviations | Partial | Blocked

## Summary
(≤ 5 lines)

## What changed
Files and directories, migrations, endpoints, config.

## How to verify
Exact commands and the expected result.

## Test evidence
Commands run and their output (pass/fail counts).

## Acceptance criteria
- [ ] <criterion copied from the brief> — evidence

## Deviations and assumptions
What differs from the brief, and why.

## Decisions others depend on
Interfaces, names, contracts introduced or changed.

## Requests
Changes needed in other workstreams, questions for the Leader or Owner.

## Known issues and debt
What is left rough.

## Suggested next tasks
```

---

## Appendix B — Changelog

- **v0.8:** every agent task file is now a self-contained runbook started with only `follow docs/tasks/<ID>.md` (preflight, steps, boundaries, verification, self-review, pre-filled report, Bangla final message, BLOCKED procedure); shared `docs/AGENT-PROTOCOL.md`; agent codes removed (branch `agent/<ID>`, report `docs/reports/<ID>.md`); ownership gaps closed with explicit allowances; feature auto-discovery (`register.ts`, feature i18n) in `M0-W1`; extra dependencies for `M3-T1` and `M4-S2`.
- **v0.7:** all remaining briefs: M3 (fees, alerts, guardian portal, pilot operations, production readiness) and M4 (launch) as tasks, M5 as a demand-gated backlog; spec `docs/spec/fees-and-alerts.md`; decisions D-18 and D-19; new tasks `M1-W5` (role homes and widget registry), `M3-D1`, `M3-U1`, `M3-O1`, `M3-U2`, `M3-O0`, `M3-P3`; consistency fixes (dependencies, phone and accessibility criteria).
- **v0.6:** results engine spec (`docs/spec/results-engine.md`, grounded in verified Bangladeshi grading rules and a real marksheet), briefs for all M2 tasks, new task `M2-P4` (sync RPC), storage policies in `M1-P1`, decision D-17 (server-side official results), `M2-Q3` is an Owner task, Munshi source copy added to `M0-O0`.
- **v0.5:** mobile-complete requirement (D-16): `docs/spec/mobile-complete.md`, phone acceptance run `M2-Q3`, phone tests in `M0-S1`, `M1-Q1`, `M1-U3`, `M1-O4`, paste import and quick add (`M1-A3`, `M1-A2`), phone list mode in `EntryGrid`, keyboard and install handling in `M0-W1`, Definition of Done, risks 14 and 15.
- **v0.4:** UX research and plan: Munshi flow analysis and international standards notes in `docs/research/`, binding `docs/spec/ux-standard.md`, decisions D-14 and D-15, UX workstream and tasks (`M0-U1`, `M0-U2`, `M1-U3`, `M1-O4`, `M1-U4`), `M1-W4` EntryGrid, axe gate in `M1-Q1`, Definition of Done extended.
- **v0.3:** full task briefs for M0 and M1 in `docs/tasks/` (one file each, generated with an index and wave map); specs in `docs/spec/`; new task `M0-O0`; corrected dependencies (M0-P1, M0-P3, M1-P1, M1-W2, M1-A1, M1-A3, M1-L1); parallelism rule replaces the WIP limit; spike paths added to §5.
- **v0.2:** optional Munshi interest link (§1.3), Hijri-calendar check (§3.3), Leader session opener (§4.2), WIP limit (§4.4), exam-calendar, pricing and running-cost capture in M0, pilot timing in `M2-O3`, risk 13.
- **v0.1:** first plan.

