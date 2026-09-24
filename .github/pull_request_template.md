## Task ID

<!-- e.g. M0-P1 -->

## Report

<!-- link to docs/reports/<TASK-ID>.md in this PR -->

## Definition of done (README §9)

- [ ] Every acceptance criterion is met, with evidence in the report.
- [ ] CI is green: lint, typecheck, unit tests; RLS tests for any schema change; E2E if a user flow changed.
- [ ] Migrations apply from scratch and are forward-only.
- [ ] No new secrets; no TODOs without a follow-up listed in the report.
- [ ] i18n complete (bn and en); works at 360 px; keyboard reachable; no console errors.
- [ ] Changed screens follow `docs/spec/ux-standard.md`: axe reports no serious or critical violations; contrast, 44 px targets, visible primary actions, non-colour status signals, no focus hidden behind sticky bars.
- [ ] Phone-complete: the feature works fully on a 360 px phone with touch only and the on-screen keyboard open (no hover, drag or laptop dependence); files, PDFs and shares are tested on Android Chrome, and on iPhone Safari where they apply.
- [ ] Docs updated wherever behaviour or contracts changed.
- [ ] Report submitted using Appendix A / the task's own section 8 skeleton.
