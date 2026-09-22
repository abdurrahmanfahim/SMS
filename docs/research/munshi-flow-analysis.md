# Munshi flow analysis: same flow or different for SMS?

Access date: 2026-09-20. Read-only look at the Munshi repo: route map (`src/App.jsx`), the Owner's own audit docs (`docs/ui-ux-audit-2026-08-30.md`, `docs/attendance-table-view-research-2026-09-03.md`, `docs/feature-roadmap-2026-09-17.md`) and the head of `ClassHomePage.jsx` and `EntryPage.jsx`. Not every page was read; the analysis rests on these. Munshi has no usage telemetry, so "how people actually use it" is an open question (see §6).

## 1. Short answer

**Different flow, same design language.** Keep Munshi's look and its hard-won interaction rules. Do not copy its navigation model, its student-by-student marks entry or its free-form form builder. SMS has several roles, several users and shared data, so it must be role- and task-based, not a drill-down through one person's documents.

## 2. How Munshi is organised (from the routes)

Home is the list of years. Then: Year → Classes (also Teachers and Routine per year) → Class hub (cards: Roster, Attendance and its summary, Forms, Subject presets, Comparison) → Form (exam) → list of students → one student's entry page (previous and next student, a floating "all students" jump showing empty, draft or done) → Report, Subject report, Print marksheet, Builder (fields). Settings is global. Routing uses `HashRouter`.

Marks entry therefore sits six levels down: Year, Class, Class hub, Forms, Form, Student. The model is one teacher, one device, everything offline in the browser database, with a first-run tour.

## 3. What Munshi has already learned (keep as rules)

From the Owner's own audits:

- Primary actions must be visible. Report and Print were hidden in a "⋮" menu and users did not find them; they were moved out.
- Icon buttons need a 44 px hit area (an `IconButton` was introduced) and an accessible label.
- Never signal status by colour alone (good/low cells got a marker plus screen-reader text).
- Distinguish "loading" from "not found" (a permanent spinner bug appeared in 11 pages).
- Wide report tables become cards on phones; the dialog becomes a bottom drawer on phones (`ResponsiveDialog`).
- Destructive confirmations state the real consequence with live counts (deleting a student also deletes their results and attendance).
- Typography: Hind Siliguri with Noto Sans Bengali for UI, SolaimanLipi scoped to results and prints so screen and paper match.
- Bulk add by pasting a list already exists in Munshi ("একসাথে যোগ করুন") and was moved to be visible on an empty roster. It is the pattern to carry into SMS for phone-only student entry.
- Attendance research: a read-only weekly or monthly grid with a sticky name column; tapping a date header opens daily entry; entry and reporting stay in separate places.

## 4. Keep, change, drop

| Area | Munshi | SMS need | Decision |
|---|---|---|---|
| Navigation | Drill-down by document: Year → Class → Form | Persistent navigation per role; primary tasks within 2 taps of home | **Change** |
| Home | List of years | Role home: teacher "today", admin setup and status, guardian per child | **Change** |
| Marks entry | Per student, all subjects | Per subject, all students, in a keyboard-first grid (that is how subject teachers work); per-student view kept for review and correction | **Change** (keep per-student as secondary) |
| Exam setup | Free-form form builder with computed fields (raw marks, total, average, grade, position) | Exam wizard with grade-scheme presets and a result engine; no free-form computed fields for normal users | **Change** (the audit itself calls the field-type concept non-obvious to first-time users) |
| Users | One user | Roles, invites, locks (marks open, locked, published), "who changed this" | **New** |
| Offline | Fully offline | Online-first with a queue for attendance and marks; visible sync status | **Change** |
| Onboarding | Tour | Setup checklist, import wizard, demo data | **Change** |
| Routing | `HashRouter` | Normal history routing with shareable links | **Change** |
| Visual language and Bangla typography | Gold and primary tokens, fonts above | Start from these and formalise in `docs/spec/design-system.md` | **Keep** |
| Interaction rules in §3 | Learned by audit | Adopted as binding rules in `docs/spec/ux-standard.md` | **Keep** |
| Report tables | Card view on phones | Same | **Keep** |
| Attendance session pills, summary grid | Present or researched | Keep pills and the read-only grid; attendance becomes the teacher's first task of the day | **Keep, re-home** |
| Marksheet print | A4 pages, `@page` landscape for wide tables | Template system with the PDF approach from `M0-S1` | **Keep the fidelity, change the mechanism** |

## 5. Consequences for the plan

- A UX workstream is added: IA and role journeys (`M0-U1`), design system (`M0-U2`), prototypes and usability test plan (`M1-U3`), Owner runs the tests (`M1-O4`), hand-off specs (`M1-U4`).
- A keyboard-first editable grid (`M1-W4`) becomes a shared component, because subject-wise marks entry is the core screen of M2.
- Munshi's terms (for example মেধাস্থান and স্তর) go into the content guide so that people moving over recognise the words.
- The Munshi importer (`M2-I1`) maps data; it does not need to map screens.

## 6. Open questions (for interviews and the Owner)

1. Do Munshi users mostly enter marks per student or per subject? Do several teachers enter marks for the same class?
2. Which Munshi screens do people use most, and which never? (No telemetry exists; ask.)
3. Do users open Munshi on a phone, a laptop, or both?
4. Is the free-form form builder used, or do most people use the same few fields?
