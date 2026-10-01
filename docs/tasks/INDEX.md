# Task index and wave map

Generated from the task briefs. `README.md` §6 holds the master board and milestone exit criteria; this file adds dependencies and waves.

**To run a task, tell the AI only: `follow docs/tasks/<ID>.md`.** Every agent task file is a self-contained runbook (see `docs/AGENT-PROTOCOL.md`).

**How to use waves:** a wave-N task depends only on tasks in earlier waves. Any task whose dependencies are `DONE` can run now, in parallel with others, because path ownership (README §5) keeps agents apart. The real limit is review capacity: hand reports to the Leader in batches.

## Wave map

### Wave 1 (start now)
- [`M0-O0`](M0-O0.md) — রিপো ও অ্যাকাউন্ট সেটআপ (OWN, S)
- [`M0-O1`](M0-O1.md) — ইন্টারভিউ ও নমুনা সংগ্রহ (OWN, L)
- [`M0-R1`](M0-R1.md) — Interview guide and competitor teardown (RES, M)
- [`M0-R2`](M0-R2.md) — Text-alert and payment providers, and running-cost model (RES, M)
- [`M0-R3`](M0-R3.md) — Student-data privacy and compliance checklist (RES, S)
- [`M2-O3`](M2-O3.md) — পাইলট প্রতিষ্ঠান জোগাড় (OWN, M)
- [`M3-O0`](M3-O0.md) — প্রোডাকশনের অ্যাকাউন্ট ও ডোমেইন (OWN, S)
- [`M0-U1`](M0-U1.md) — Information architecture, role journeys and screen inventory (UX, M)

### Wave 2
- [`M0-O2`](M0-O2.md) — ব্যবসা, আইন ও সেবাদাতার আবেদন (OWN, M)
- [`M0-P1`](M0-P1.md) — Monorepo scaffold and CI (PLAT, M)
- [`M0-U2`](M0-U2.md) — Design system spec v0: tokens, Bangla typography, components, content guide (UX, M)

### Wave 3
- [`M0-P2`](M0-P2.md) — Supabase local, migrations, SQL tests, generated types (PLAT, M)
- [`M0-W1`](M0-W1.md) — App shell, design tokens, i18n, PWA baseline (WEB, M)
- [`M0-S1`](M0-S1.md) — Spike: Bangla marksheet PDF and print (EXAM, M)
- [`M1-D1`](M1-D1.md) — Domain foundations: money, dates, phones, digits, names (DOM, S)
- [`M4-L1`](M4-L1.md) — আইনি নথি: শর্ত, গোপনীয়তা নীতি, সম্মতি (OWN, M)
- [`M1-U3`](M1-U3.md) — Clickable prototypes and usability test plan for five critical flows (UX, M)

### Wave 4
- [`M0-P3`](M0-P3.md) — Walking skeleton on staging (PLAT, M)
- [`M0-S2`](M0-S2.md) — Spike: offline queue for attendance and marks (WEB, M)
- [`M1-W3`](M1-W3.md) — Shared data table, forms, upload, print base (WEB, M)
- [`M2-D1`](M2-D1.md) — Result engine core (DOM, M)
- [`M3-D1`](M3-D1.md) — Fees and alerts domain logic (DOM, M)
- [`M1-O4`](M1-O4.md) — ইউজার টেস্ট: প্রোটোটাইপ দেখিয়ে পরীক্ষা (OWN, M)

### Wave 5
- [`M1-P1`](M1-P1.md) — Core schema, RLS helpers, audit log, RLS test harness (PLAT, M)
- [`M2-D2`](M2-D2.md) — Ranking, analytics and Munshi parity tests (DOM, M)
- [`M3-P3`](M3-P3.md) — Production environment, release process, backups, monitoring (PLAT, M)
- [`M1-W4`](M1-W4.md) — EntryGrid: keyboard-first editable grid (WEB, M)
- [`M1-U4`](M1-U4.md) — Prototype revision and screen specs (hand-off) (UX, S)

### Wave 6
- [`M1-W5`](M1-W5.md) — Role homes, home widget registry and setup checklist (WEB, M)
- [`M1-P2`](M1-P2.md) — Auth flows: provisioned users, sign-in, invites, resets (PLAT, M)
- [`M1-P3`](M1-P3.md) — Platform tables and RPCs: tenants, plans, credits, impersonation (PLAT, M)
- [`M1-A1`](M1-A1.md) — Academic structure: years, levels, sections, subjects, assignments (ACAD, M)
- [`M1-Q1`](M1-Q1.md) — E2E harness, RLS registry and CI gates (QA, M)
- [`M2-P4`](M2-P4.md) — Production sync RPC apply_ops for attendance and marks (PLAT, M)
- [`M2-D3`](M2-D3.md) — Munshi parity tests (DOM, S)
- [`M2-C1`](M2-C1.md) — Notices v0 (COMM, S)
- [`M3-U1`](M3-U1.md) — Flows, prototypes and test plan: fees, text alerts, guardian portal (UX, M)
- [`M4-S2`](M4-S2.md) — Data lifecycle: export, offboarding, deletion, retention (PLAT, M)
- [`M4-O1`](M4-O1.md) — Operations: status page, incident runbook, dashboards (PLAT, M)

### Wave 7
- [`M1-W2`](M1-W2.md) — Sign-in, platform console, institution settings, user management UI (WEB, M)
- [`M1-A2`](M1-A2.md) — Students, guardians and enrollments (ACAD, M)
- [`M2-E1`](M2-E1.md) — Exam setup: exams, subjects, components, grade schemes (EXAM, M)
- [`M3-O1`](M3-O1.md) — ইউজার টেস্ট: ফি, অ্যালার্ট ও অভিভাবক প্রোটোটাইপ (OWN, M)
- [`M3-T1`](M3-T1.md) — Text alerts core: outbox, provider adapter, worker, credits (COMM, M)
- [`M4-L2`](M4-L2.md) — Consent records and in-app legal pages (PLAT, M)

### Wave 8
- [`M1-A3`](M1-A3.md) — Bulk import of students: CSV, XLSX and pasted lists (ACAD, M)
- [`M1-A4`](M1-A4.md) — Year rollover and promotion (ACAD, S)
- [`M2-E2`](M2-E2.md) — Marks entry: subject-wise grid, offline queue, locks (EXAM, M)
- [`M2-A5`](M2-A5.md) — Attendance: daily marking, offline, corrections, summaries (ACAD, M)
- [`M3-U2`](M3-U2.md) — Prototype revision and screen specs for M3 (hand-off) (UX, S)
- [`M4-A1`](M4-A1.md) — Optional: Play Store listing through a Trusted Web Activity (WEB, S)

### Wave 9
- [`M2-E3`](M2-E3.md) — Results: preview, tabulation, publish snapshots (EXAM, M)
- [`M2-I1`](M2-I1.md) — Munshi importer (EXAM, M)
- [`M3-F1`](M3-F1.md) — Fee structure: heads, plans, assignments, waivers (FIN, M)
- [`M3-G1`](M3-G1.md) — Guardian portal: invite, sign-in, child switcher, shell (COMM, M)

### Wave 10
- [`M2-E4`](M2-E4.md) — Marksheet PDFs: templates, batch, share from a phone (EXAM, M)
- [`M2-G1`](M2-G1.md) — Demo tenant seeder and first 10 help articles (GTM, S)
- [`M3-F2`](M3-F2.md) — Invoicing and dues (FIN, M)

### Wave 11
- [`M2-Q2`](M2-Q2.md) — E2E full exam cycle, performance, accessibility, phone acceptance kit (QA, M)
- [`M3-F3`](M3-F3.md) — Payments, receipts, voids, month close (FIN, M)
- [`M3-T2`](M3-T2.md) — Alert templates, triggers and admin screens (COMM, M)
- [`M3-P1`](M3-P1.md) — Pilot onboarding runbook and support playbook (GTM, S)

### Wave 12
- [`M2-Q3`](M2-Q3.md) — ফোন-অনলি অ্যাকসেপ্টেন্স রান (OWN, M)
- [`M3-F4`](M3-F4.md) — Fee reports and accountant home (FIN, M)
- [`M3-G2`](M3-G2.md) — Guardian portal: attendance, results, dues, notices (COMM, M)

### Wave 13
- [`M3-Q1`](M3-Q1.md) — Pilot readiness: M3 features, RLS, accessibility, phone pass (QA, M)
- [`M3-P2`](M3-P2.md) — পাইলট চালানো (OWN, L)

### Wave 14
- [`M4-S1`](M4-S1.md) — Security review (QA, M)
- [`M4-B0`](M4-B0.md) — দাম ও প্ল্যান ঠিক করা (OWN, M)
- [`M4-Q1`](M4-Q1.md) — Scale and performance test at target size (QA, M)

### Wave 15
- [`M4-B1`](M4-B1.md) — Billing operations v1: plan limits, trials, subscription invoices (PLAT, M)
- [`M4-W1`](M4-W1.md) — Landing site, pricing page and demo (GTM, M)

### Wave 16
- [`M4-W2`](M4-W2.md) — Help centre to 25 articles (GTM, S)

### Wave 17
- [`M4-R1`](M4-R1.md) — লঞ্চের প্রস্তুতি ও প্রথম গ্রাহক (OWN, M)

### Done
- M0-L1 — Domain and data-model spec v0
- M1-L1 — Exam and result engine spec and golden-test plan
- M3-L1 — Fees, text alerts and guardian portal spec v0

### Backlog (M5, demand-gated, not scheduled)
- [`M5-T1`](M5-T1.md) — Timetable and routine (port Munshi scheduler) (ACAD, L). Starts when: 2+ institutions ask for it
- [`M5-D1`](M5-D1.md) — Admit cards and seat plans (EXAM, M). Starts when: 2+ institutions ask, or needed to close a sale
- [`M5-D2`](M5-D2.md) — ID cards and certificates (EXAM, M). Starts when: 2+ institutions ask
- [`M5-P1`](M5-P1.md) — Online payments (bKash, Nagad, aggregator) (FIN, L). Starts when: Merchant account approved and 2+ institutions ask
- [`M5-B1`](M5-B1.md) — Multi-branch institutions (PLAT, L). Starts when: 1+ institution with branches wants to buy
- [`M5-H1`](M5-H1.md) — Teacher attendance and basic HR (ACAD, M). Starts when: 2+ institutions ask
- [`M5-A1`](M5-A1.md) — Analytics dashboard (EXAM, M). Starts when: Pilots confirm they use the reports
- [`M5-S1`](M5-S1.md) — Self-serve signup and trials (PLAT, M). Starts when: Manual onboarding becomes the bottleneck
- [`M5-X1`](M5-X1.md) — Import from other systems (ACAD, M). Starts when: A sale is blocked by migration
- [`M5-M1`](M5-M1.md) — Madrasa-specific formats (EXAM, L). Starts when: Pilot madrasas need it (from M0-O1 findings)
- [`M5-E1`](M5-E1.md) — Homework, diary and class notes (COMM, M). Starts when: 2+ institutions ask
- [`M5-HS1`](M5-HS1.md) — Hostel and mess accounts (FIN, M). Starts when: Pilot institutions with hostels ask
- [`M5-MSG1`](M5-MSG1.md) — WhatsApp Business messaging (COMM, L). Starts when: Approval obtained and cost beats text messages
- [`M5-L1`](M5-L1.md) — Library (ACAD, M). Starts when: 2+ institutions ask
- [`M5-R1`](M5-R1.md) — Referral and reseller programme (OWN, M). Starts when: Sales channel is the bottleneck

## All tasks

| ID | WS | Title | Size | Wave | Depends on | Status |
|---|---|---|---|---|---|---|
| [M1-W5](M1-W5.md) | WEB | Role homes, home widget registry and setup checklist | M | 6 | M1-W3, M1-U4 | TODO |
| [M0-L1](M0-L1.md) | L | Domain and data-model spec v0 | M | 0 | — | DONE |
| [M0-O0](M0-O0.md) | OWN | রিপো ও অ্যাকাউন্ট সেটআপ | S | 1 | — | READY |
| [M0-O1](M0-O1.md) | OWN | ইন্টারভিউ ও নমুনা সংগ্রহ | L | 1 | — | READY |
| [M0-O2](M0-O2.md) | OWN | ব্যবসা, আইন ও সেবাদাতার আবেদন | M | 2 | M0-R2, M0-R3 | TODO |
| [M0-R1](M0-R1.md) | RES | Interview guide and competitor teardown | M | 1 | — | READY |
| [M0-R2](M0-R2.md) | RES | Text-alert and payment providers, and running-cost model | M | 1 | — | READY |
| [M0-R3](M0-R3.md) | RES | Student-data privacy and compliance checklist | S | 1 | — | READY |
| [M0-P1](M0-P1.md) | PLAT | Monorepo scaffold and CI | M | 2 | M0-O0 | TODO |
| [M0-P2](M0-P2.md) | PLAT | Supabase local, migrations, SQL tests, generated types | M | 3 | M0-P1 | TODO |
| [M0-W1](M0-W1.md) | WEB | App shell, design tokens, i18n, PWA baseline | M | 3 | M0-P1, M0-U2 | TODO |
| [M0-P3](M0-P3.md) | PLAT | Walking skeleton on staging | M | 4 | M0-P2, M0-W1, M0-O0 | TODO |
| [M0-S1](M0-S1.md) | EXAM | Spike: Bangla marksheet PDF and print | M | 3 | M0-P1 | TODO |
| [M0-S2](M0-S2.md) | WEB | Spike: offline queue for attendance and marks | M | 4 | M0-P2 | TODO |
| [M1-L1](M1-L1.md) | L | Exam and result engine spec and golden-test plan | M | 0 | M0-L1 | DONE |
| [M1-P1](M1-P1.md) | PLAT | Core schema, RLS helpers, audit log, RLS test harness | M | 5 | M0-P3 | TODO |
| [M1-P2](M1-P2.md) | PLAT | Auth flows: provisioned users, sign-in, invites, resets | M | 6 | M1-P1 | TODO |
| [M1-P3](M1-P3.md) | PLAT | Platform tables and RPCs: tenants, plans, credits, impersonation | M | 6 | M1-P1 | TODO |
| [M1-W3](M1-W3.md) | WEB | Shared data table, forms, upload, print base | M | 4 | M0-W1 | TODO |
| [M1-D1](M1-D1.md) | DOM | Domain foundations: money, dates, phones, digits, names | S | 3 | M0-P1 | TODO |
| [M1-W2](M1-W2.md) | WEB | Sign-in, platform console, institution settings, user management UI | M | 7 | M1-P2, M1-P3, M1-W3 | TODO |
| [M1-A1](M1-A1.md) | ACAD | Academic structure: years, levels, sections, subjects, assignments | M | 6 | M1-P1, M1-W3, M1-D1 | TODO |
| [M1-A2](M1-A2.md) | ACAD | Students, guardians and enrollments | M | 7 | M1-A1 | TODO |
| [M1-A3](M1-A3.md) | ACAD | Bulk import of students: CSV, XLSX and pasted lists | M | 8 | M1-A2, M1-U4 | TODO |
| [M1-A4](M1-A4.md) | ACAD | Year rollover and promotion | S | 8 | M1-A2 | TODO |
| [M1-Q1](M1-Q1.md) | QA | E2E harness, RLS registry and CI gates | M | 6 | M1-P1 | TODO |
| [M2-P4](M2-P4.md) | PLAT | Production sync RPC apply_ops for attendance and marks | M | 6 | M0-S2, M1-P1 | TODO |
| [M2-D1](M2-D1.md) | DOM | Result engine core | M | 4 | M1-L1, M1-D1 | TODO |
| [M2-D2](M2-D2.md) | DOM | Ranking, analytics and Munshi parity tests | M | 5 | M2-D1 | TODO |
| [M2-D3](M2-D3.md) | DOM | Munshi parity tests | S | 6 | M2-D2 | TODO |
| [M2-E1](M2-E1.md) | EXAM | Exam setup: exams, subjects, components, grade schemes | M | 7 | M1-A1, M2-D1, M1-U4 | TODO |
| [M2-E2](M2-E2.md) | EXAM | Marks entry: subject-wise grid, offline queue, locks | M | 8 | M2-E1, M2-P4, M1-W4, M1-U4, M1-W5 | TODO |
| [M2-E3](M2-E3.md) | EXAM | Results: preview, tabulation, publish snapshots | M | 9 | M2-E2, M2-D2, M1-U4, M1-W5 | TODO |
| [M2-E4](M2-E4.md) | EXAM | Marksheet PDFs: templates, batch, share from a phone | M | 10 | M2-E3, M0-S1 | TODO |
| [M2-A5](M2-A5.md) | ACAD | Attendance: daily marking, offline, corrections, summaries | M | 8 | M1-A2, M2-P4, M1-U4, M1-W5 | TODO |
| [M2-I1](M2-I1.md) | EXAM | Munshi importer | M | 9 | M1-A3, M2-E1, M2-D2, M2-D3 | TODO |
| [M2-C1](M2-C1.md) | COMM | Notices v0 | S | 6 | M1-P1, M1-W3 | TODO |
| [M2-Q2](M2-Q2.md) | QA | E2E full exam cycle, performance, accessibility, phone acceptance kit | M | 11 | M2-E4, M2-A5, M1-Q1, M1-W2 | TODO |
| [M2-Q3](M2-Q3.md) | OWN | ফোন-অনলি অ্যাকসেপ্টেন্স রান | M | 12 | M2-Q2 | TODO |
| [M2-G1](M2-G1.md) | GTM | Demo tenant seeder and first 10 help articles | S | 10 | M2-E3, M0-U2 | TODO |
| [M2-O3](M2-O3.md) | OWN | পাইলট প্রতিষ্ঠান জোগাড় | M | 1 | — | READY |
| [M3-L1](M3-L1.md) | L | Fees, text alerts and guardian portal spec v0 | M | 0 | M0-L1 | DONE |
| [M3-D1](M3-D1.md) | DOM | Fees and alerts domain logic | M | 4 | M3-L1, M1-D1 | TODO |
| [M3-U1](M3-U1.md) | UX | Flows, prototypes and test plan: fees, text alerts, guardian portal | M | 6 | M3-L1, M1-U4 | TODO |
| [M3-O1](M3-O1.md) | OWN | ইউজার টেস্ট: ফি, অ্যালার্ট ও অভিভাবক প্রোটোটাইপ | M | 7 | M3-U1 | TODO |
| [M3-U2](M3-U2.md) | UX | Prototype revision and screen specs for M3 (hand-off) | S | 8 | M3-O1 | TODO |
| [M3-O0](M3-O0.md) | OWN | প্রোডাকশনের অ্যাকাউন্ট ও ডোমেইন | S | 1 | — | READY |
| [M3-F1](M3-F1.md) | FIN | Fee structure: heads, plans, assignments, waivers | M | 9 | M3-L1, M1-A1, M3-U2 | TODO |
| [M3-F2](M3-F2.md) | FIN | Invoicing and dues | M | 10 | M3-F1, M1-A2, M3-D1 | TODO |
| [M3-F3](M3-F3.md) | FIN | Payments, receipts, voids, month close | M | 11 | M3-F2, M2-E4 | TODO |
| [M3-F4](M3-F4.md) | FIN | Fee reports and accountant home | M | 12 | M3-F3, M1-W5 | TODO |
| [M3-T1](M3-T1.md) | COMM | Text alerts core: outbox, provider adapter, worker, credits | M | 7 | M3-D1, M1-P3, M0-R2 | TODO |
| [M3-T2](M3-T2.md) | COMM | Alert templates, triggers and admin screens | M | 11 | M3-T1, M2-A5, M2-E3, M3-F2, M3-U2 | TODO |
| [M3-G1](M3-G1.md) | COMM | Guardian portal: invite, sign-in, child switcher, shell | M | 9 | M1-P2, M3-U2, M1-W5 | TODO |
| [M3-G2](M3-G2.md) | COMM | Guardian portal: attendance, results, dues, notices | M | 12 | M3-G1, M2-E4, M2-A5, M3-F3, M2-C1 | TODO |
| [M3-P1](M3-P1.md) | GTM | Pilot onboarding runbook and support playbook | S | 11 | M2-G1 | TODO |
| [M3-P3](M3-P3.md) | PLAT | Production environment, release process, backups, monitoring | M | 5 | M0-P3, M3-O0 | TODO |
| [M3-Q1](M3-Q1.md) | QA | Pilot readiness: M3 features, RLS, accessibility, phone pass | M | 13 | M3-G2, M3-T2, M3-F4, M3-P3, M2-I1 | TODO |
| [M3-P2](M3-P2.md) | OWN | পাইলট চালানো | L | 13 | M3-P1, M3-P3, M2-Q3, M2-O3 | TODO |
| [M4-S1](M4-S1.md) | QA | Security review | M | 14 | M3-Q1 | TODO |
| [M4-S2](M4-S2.md) | PLAT | Data lifecycle: export, offboarding, deletion, retention | M | 6 | M3-P3, M0-R3 | TODO |
| [M4-O1](M4-O1.md) | PLAT | Operations: status page, incident runbook, dashboards | M | 6 | M3-P3 | TODO |
| [M4-B0](M4-B0.md) | OWN | দাম ও প্ল্যান ঠিক করা | M | 14 | M3-P2 | TODO |
| [M4-B1](M4-B1.md) | PLAT | Billing operations v1: plan limits, trials, subscription invoices | M | 15 | M4-B0, M1-P3 | TODO |
| [M4-L1](M4-L1.md) | OWN | আইনি নথি: শর্ত, গোপনীয়তা নীতি, সম্মতি | M | 3 | M0-O2 | TODO |
| [M4-L2](M4-L2.md) | PLAT | Consent records and in-app legal pages | M | 7 | M4-L1, M1-P2 | TODO |
| [M4-W1](M4-W1.md) | GTM | Landing site, pricing page and demo | M | 15 | M4-B0, M2-G1 | TODO |
| [M4-W2](M4-W2.md) | GTM | Help centre to 25 articles | S | 16 | M3-P2, M4-W1 | TODO |
| [M4-Q1](M4-Q1.md) | QA | Scale and performance test at target size | M | 14 | M3-Q1, M1-A4 | TODO |
| [M4-A1](M4-A1.md) | WEB | Optional: Play Store listing through a Trusted Web Activity | S | 8 | M4-L2 | TODO |
| [M4-R1](M4-R1.md) | OWN | লঞ্চের প্রস্তুতি ও প্রথম গ্রাহক | M | 17 | M4-S1, M4-S2, M4-O1, M4-B1, M4-L2, M4-W1, M4-W2, M4-Q1 | TODO |
| [M5-T1](M5-T1.md) | ACAD | Timetable and routine (port Munshi scheduler) | L | — | — | BACKLOG |
| [M5-D1](M5-D1.md) | EXAM | Admit cards and seat plans | M | — | — | BACKLOG |
| [M5-D2](M5-D2.md) | EXAM | ID cards and certificates | M | — | — | BACKLOG |
| [M5-P1](M5-P1.md) | FIN | Online payments (bKash, Nagad, aggregator) | L | — | — | BACKLOG |
| [M5-B1](M5-B1.md) | PLAT | Multi-branch institutions | L | — | — | BACKLOG |
| [M5-H1](M5-H1.md) | ACAD | Teacher attendance and basic HR | M | — | — | BACKLOG |
| [M5-A1](M5-A1.md) | EXAM | Analytics dashboard | M | — | — | BACKLOG |
| [M5-S1](M5-S1.md) | PLAT | Self-serve signup and trials | M | — | — | BACKLOG |
| [M5-X1](M5-X1.md) | ACAD | Import from other systems | M | — | — | BACKLOG |
| [M5-M1](M5-M1.md) | EXAM | Madrasa-specific formats | L | — | — | BACKLOG |
| [M5-E1](M5-E1.md) | COMM | Homework, diary and class notes | M | — | — | BACKLOG |
| [M5-HS1](M5-HS1.md) | FIN | Hostel and mess accounts | M | — | — | BACKLOG |
| [M5-MSG1](M5-MSG1.md) | COMM | WhatsApp Business messaging | L | — | — | BACKLOG |
| [M5-L1](M5-L1.md) | ACAD | Library | M | — | — | BACKLOG |
| [M5-R1](M5-R1.md) | OWN | Referral and reseller programme | M | — | — | BACKLOG |
| [M0-U1](M0-U1.md) | UX | Information architecture, role journeys and screen inventory | M | 1 | — | READY |
| [M0-U2](M0-U2.md) | UX | Design system spec v0: tokens, Bangla typography, components, content guide | M | 2 | M0-U1 | TODO |
| [M1-W4](M1-W4.md) | WEB | EntryGrid: keyboard-first editable grid | M | 5 | M1-W3 | TODO |
| [M1-U3](M1-U3.md) | UX | Clickable prototypes and usability test plan for five critical flows | M | 3 | M0-U2 | TODO |
| [M1-O4](M1-O4.md) | OWN | ইউজার টেস্ট: প্রোটোটাইপ দেখিয়ে পরীক্ষা | M | 4 | M1-U3 | TODO |
| [M1-U4](M1-U4.md) | UX | Prototype revision and screen specs (hand-off) | S | 5 | M1-O4 | TODO |
