# UX standard (binding for every screen)

Adopted under decision D-14. Sources and reasoning: `docs/research/ux-standards.md`. Origin of the Munshi-derived rules: `docs/research/munshi-flow-analysis.md`. "Project rule" means our own choice, not a quoted standard.

## 1. Process (ISO 9241-210)

- Every critical flow is prototyped and tested with 5 to 8 real users before it is built (`M1-U3`, `M1-O4`). Later flows repeat the loop when they are big or new.
- Success is measured per flow: task success, time, errors, satisfaction (ISO 9241-11).
- Pilots (M3) are the evaluation step; their findings feed the next iteration.

## 2. Structure and navigation

- Role- and task-based. Each role has its own home. Primary tasks are reachable within 2 taps of home (project rule).
- Mobile: bottom tab bar with at most 5 items. Desktop: sidebar. Same items, same order, same names across pages.
- Primary actions are always visible on the page. Overflow menus hold secondary actions only (Munshi lesson).
- A help entry sits in the same place on every page (WCAG 3.2.6).
- Every screen shows where you are and how to go back.

## 3. Accessibility (WCAG 2.2 AA)

- Text contrast at least 4.5:1 (3:1 for large text); UI parts and icons at least 3:1.
- Never use colour alone: statuses (present, absent, passed, failed, low, good) always carry an icon or text as well.
- Every control works by keyboard. Focus is visible and never hidden under a sticky bar (2.4.11); use scroll padding.
- Any drag interaction has a button alternative (2.5.7), for example reorder with up and down buttons.
- Sign-in allows paste and password managers, and has no puzzle or memory test (3.3.8).
- Do not ask for the same information twice in one flow; prefill or offer a choice (3.3.7).
- Layouts survive user text spacing (line height 1.5, larger word and letter spacing) without clipping (1.4.12).
- Icon-only buttons have an accessible name. Forms have visible labels, not placeholders alone.

## 4. Touch and layout

- **Phone-complete (D-16):** every task in every role must be doable on a phone alone, without a laptop, zooming or horizontal page scrolling. Tablets and desktops are enhancements. Binding detail: `docs/spec/mobile-complete.md`.
- Minimum control size 44×44 CSS px with 8 px between controls (project rule; WCAG minimum is 24). This applies to every part of a segmented control too: each segment is its own 44×44 target (`leader-rulings.md` R-04).
- Design at 360 px first. Wide tables become cards on phones; grids that must stay grids (attendance, marks) keep a sticky header row and first column and scroll inside their own container.
- Dialogs become bottom drawers on phones.
- Thumb zone: frequent actions sit low and central.

## 5. Bangla and localisation

- Bangla is the default language; English is switchable. Digits are stored as ASCII and shown in Bangla or English by user setting; input accepts both.
- Base text size at least 16 px on phones and line height at least 1.6 for Bangla body text (project rule; verify with users). Do not use fixed-height boxes for text.
- Test with real conjuncts, vowel signs, mixed Bangla, English and Arabic names, and very long names (W3C Bengali layout notes are the reference).
- Use words teachers use (marksheet, roll, class, attendance, result), not system words. The terminology list lives in `docs/spec/content-guide.md`.

## 6. Feedback, errors and safety (Nielsen)

- Every action shows its state: loading, saving, saved, failed. Offline queue shows Synced, Pending n, Error. Loading is never confused with not found.
- Prevent errors first: validate inline (for example marks above full marks), lock states are visible (marks open, locked, published), destructive actions ask for confirmation that names the real consequence with counts.
- Undo or a clear way out wherever possible.
- Error message pattern: what happened, what to do next, no codes for users.

## 7. Data entry

- Marks and fees use the keyboard-first `EntryGrid`: arrows, Tab and Enter move between cells; on phones a focused-cell editor with next and previous, numeric keypad, Bangla digits accepted.
- Never lose typed data: keep values on validation errors and on connection loss.
- Bulk paths exist next to single paths (import, "mark all present" with confirmation when it overwrites).
- With the on-screen keyboard open, the focused field and its primary action stay visible (viewport option `interactive-widget=resizes-content` plus a visual-viewport fallback; test on Android Chrome and iOS Safari).

## 8. Performance (Core Web Vitals, field data at the 75th percentile)

- LCP at most 2.5 s, INP at most 200 ms, CLS at most 0.1. CI checks lab proxies on a throttled mobile profile (budgets in ADR 0005).

## 9. Checks before merge

- axe-core: no serious or critical violations on changed screens.
- Manual pass with keyboard only, 360 px width and text spacing override.
- Nielsen list reviewed for new flows; findings noted in the report.
- Real-phone check for changed flows: Android Chrome always, iPhone Safari for flows that share, print or install.
