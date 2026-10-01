# Report — M1-U3b — Marks prototype typing bug, in-place cell updates, Owner phone checklist

**Status:** Done, Owner phone check pending (no real phone or browser in this sandbox)
**Branch:** agent/M1-U3b · Written by Claude at the Owner's request, not by a runbook agent

## Understanding
The Owner opened the prototypes on a real phone (as M1-O4 intends) and reported: in the marks flow only the first cell could be typed in; overall UI/UX felt poor. M1-U3 had only been tested with jsdom, never with real focus behaviour.

## Root cause (marks)
`commitCell()` ran on every blur and called `renderGrid()`, which replaces all 40 `<input>` nodes via `innerHTML`, and then called `.focus()` on the cell just left. So tapping another cell destroyed the tapped element and pulled focus back to the previous one (and closed the on-screen keyboard). The old jsdom check re-queried the DOM after blur, which hid the replaced nodes — that is why it passed.

## What changed
- `prototypes/marks/index.html`: grid is built once; each edit updates only its row (`paintCell`); no focus is ever moved by validation; event delegation on `<tbody>`; focused row scrolls into view clear of the fixed bars.
- Numeric keypad cannot type "অ", so absent is now a 44px **অ** button per row (typing "অ"/"a" still works with a hardware keyboard).
- Layout tightened for 360px so name, roll, input and অ button fit without sideways scroll (could not be checked visually here).
- `prototypes/marks-typing.test.mjs` (new): regression test with real focus()/blur(), kept node references and a "no node replaced" assertion. It fails on the old code (focus snaps back) and passes on the new.
- `prototypes/jsdom-smoke.mjs`: marks block now uses real blur and asserts the node is kept.
- `docs/research/owner-phone-checklist.md`: 5–10 minute checklist for the Owner's phone.

## Verify output
- `node prototypes/marks-typing.test.mjs` — 14 passed, 0 failed (old code: focus-snap checks fail)
- `node prototypes/jsdom-smoke.mjs` — 34 passed, 0 failed
- `node prototypes/check-touch-targets.mjs` — PASS
(These scripts load pages from `http://localhost:4173`, so serve `prototypes/` first: `python3 -m http.server 4173 --directory prototypes`.)

## Not done / not verified
- [ ] Real phone check (Owner) — see `docs/research/owner-phone-checklist.md`. Nothing here is verified on a device.
- [ ] Broader UI/UX pass: the Owner said the UI/UX is poor overall but gave no screens or specifics yet. Only the marks flow was changed. The other four prototypes were audited for the same re-render/focus pattern and do not have it (no input is rebuilt while typing).
- [ ] axe-core accessibility run: still blocked (no browser in sandbox), unchanged from M1-U3.

## Suggested next
Owner runs the phone checklist and lists the worst screens; a follow-up UX pass then targets exactly those. M1-O4 should not start until the marks checklist passes.
