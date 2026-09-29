# Design system spec v0 (task M0-U2)

Binding per D-14. Tokens referenced here (`color.*`, `typeScale.*`, `spacing.*`, etc.) live in `docs/spec/design-tokens.json` — token names there map one to one to CSS variables in `packages/ui` (contract, do not rename either side without updating both). This document does not implement anything in code (that is `M0-W1`/`M1-W3`); it is the specification those tasks build from.

## 1. Bangla typography

### Fonts and licences
| Font | Use | Source | Licence | Note |
|---|---|---|---|---|
| Hind Siliguri | UI text (Bangla), body copy | Google Fonts | SIL Open Font License 1.1 | Free for commercial use, self-host the woff2 files (no external font CDN call, matching the offline-first/CSP-restricted pattern used elsewhere in this project). |
| Noto Sans Bengali | Fallback for Bangla glyphs Hind Siliguri does not cover (rare conjuncts, some Unicode ranges) | Google Fonts | SIL Open Font License 1.1 | Loaded as a fallback in the font stack, not the primary UI font — Hind Siliguri first for its warmer, more legible letterforms at small sizes. |
| SolaimanLipi | Results and printed marksheets only (scoped, not UI) | `docs/spec/fonts/solaimanlipi/` (Owner-supplied, v2.002, `M0-O2`) — designed by Solaiman Karim, developed by Al Mamun Hossen, copyright Ekushey (`ekushey.org`) | SIL Open Font License 1.1 — confirmed directly from the font's own embedded metadata (`fontTools`-read `name` table, `nameID` 13/14), not a third-party mirror. See `docs/spec/fonts/solaimanlipi/README.md` for the full provenance note (three historical releases exist under two different licences; only the 2022/OFL-1.1 one is bundled here) and for why the earlier "sources disagree" note existed. Free to embed in a paid product's generated PDFs; may not be sold standalone; not modified here so the Reserved Font Name restriction doesn't apply. Not a lawyer's opinion — treat as strong evidence, not final legal sign-off, per `M0-O2` step 2. |
| Latin/numeral fallback | English text, ASCII digits inside Bangla sentences | System font stack (`-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) | N/A | Used only where English words appear inline; never the primary UI font. |

Font stack (CSS custom property, to become `--font-bangla` in `packages/ui`):
```
font-family: "Hind Siliguri", "Noto Sans Bengali", -apple-system, "Segoe UI", Roboto, sans-serif;
```
Results/print stack (`--font-print`), scoped to marksheet templates only:
```
font-family: "SolaimanLipi", "Hind Siliguri", "Noto Sans Bengali", sans-serif;
```

### Base size, line height, weights
- Base size: `typeScale.base` = 1rem (16px), per `design-tokens.json`.
- Line height: Bangla needs more vertical room than Latin for matras (vowel signs above/below the baseline) and conjuncts (stacked consonant clusters) not to visually collide between lines. `typeScale`'s `lineHeight` values (1.3–1.65 depending on size) are already tuned higher than a typical Latin-only scale (which commonly uses 1.2–1.5) for this reason — always use the token's line-height, never a hand-picked one, when Bangla text can appear (which is everywhere by default, per D-05/i18n).
- Weights: Regular (400) for body text, Medium (500) for labels/table headers, Semibold (600) for buttons and headings. Hind Siliguri ships these three weights; do not use Bold (700) for Bangla body text — at UI sizes it visually clots conjuncts rather than clarifying them.

### Conjunct rendering
Bangla conjuncts (যুক্তাক্ষর — e.g. ক্ষ, জ্ঞ, ন্ত) must render as their correct stacked/ligated glyph, not as a broken sequence of a virama (্) plus separate letters. Test with real conjunct-heavy strings, never lorem ipsum:
- `বিদ্যালয়` (school) — tests দ্য conjunct
- `শিক্ষার্থী` (student) — tests ক্ষ and র্থ conjuncts
- `রাষ্ট্রীয়` (national, used in some formal document titles) — tests a triple conjunct ষ্ট্র, a stress case
- Any font substitution (e.g. a system font silently replacing Hind Siliguri because self-hosted woff2 failed to load) must be caught visually in QA — a broken conjunct is a shipped-font-loading bug, not a content bug.

### Bangla and ASCII digits
Bangla has its own digit glyphs (০১২৩৪৫৬৭৮৯). Rule: **UI numbers that are counts, IDs, dates in ISO form, or anything a person might need to type back into a search box or another system use ASCII digits (0-9)**; **numbers that are purely for a Bangla-reading person to read (marks on a printed marksheet, a spoken-style date on a notice) use Bangla digits**. Concretely:
- Roll numbers, phone numbers, exam scores in an editable grid, dates in ISO form, currency amounts in accountant-facing tables → ASCII digits (a teacher typing marks on a numeric keypad expects ASCII digits back).
- A published marksheet's "রোল: ১২" style label, a notice's "৩ জন অনুপস্থিত" style body text → Bangla digits, matching how these documents read in Bangla.
- Never mix both digit systems within the same number (no "১2৩").

### Long names
Bangla and Arabic-script names (common for madrasa students) can run long (e.g. "মোঃ আব্দুর রহমান ফাহিম চৌধুরী"). Every layout showing a name (student list rows, cards, marksheet headers) must:
- Truncate with an ellipsis in list/table rows, never wrap and break row height (wrapping breaks the sticky-header/dense-grid patterns used in attendance and marks screens); the full name is always available on tap (opens the profile) or via a native `title`/tooltip-equivalent.
- Never truncate on a marksheet or printed document — these must wrap onto a second line rather than cut off a legal name.
- Reserve enough width in card/list layouts (a minimum of ~20 characters before truncation kicks in) since a too-aggressive truncation width makes almost every long Bangla name unreadable.

## 2. Layout grid, iconography, dark mode, motion

### Layout grid
- Breakpoints: `sm` 360px (phone, the primary target per D-16), `md` 768px (tablet/small laptop), `lg` 1280px (desktop, secondary).
- Phone (`sm`): single column, no grid — content stacks full-width with `spacing.4` (1rem) side padding.
- Tablet (`md`): up to 2 columns for card grids (e.g. student cards), 12-column grid available for admin/report layouts.
- Desktop (`lg`): 12-column grid, max content width 1152px (`lg` breakpoint minus side gutters), centered; sidebar nav (§2 of `ux-flows.md`) takes a fixed 240px column outside the content grid.

### Iconography
- One icon set only (avoid mixing visual weights): `lucide-react` (already available per this environment's React library list) — outline style, 1.5px stroke, sized in even steps (16/20/24px) matching `spacing` tokens.
- Icons that convey status (success/warning/danger) must never be color-only (`ux-standard.md` — "never colour alone"): pair with a shape difference (check/circle-alert/triangle-alert) and a text label or `aria-label`.
- Decorative icons (e.g. a home-tab icon next to its own text label) get `aria-hidden="true"`; functional icons with no visible label (an icon-only button) get an explicit `aria-label` in Bangla first.

### Dark mode
- Every screen must work in both themes; `color.light`/`color.dark` in `design-tokens.json` are the only two theme color sets — no screen-specific overrides.
- Dark theme does not simply invert light theme: brand colors (`primary`, `accent`, `success`, `warning`, `danger`, `info`) are each given their own, brighter dark-mode value with a dark foreground color (see `design-tokens.json`), rather than reusing the light-mode color at reduced opacity — this is what makes the required contrast ratios achievable (verified in §6).
- Elevation in dark mode uses a 1px light border instead of a drop shadow (`elevation.dark` tokens) since shadows are barely visible against a dark surface — see `design-tokens.json`'s `elevation.note`.

### Motion and reduced motion
- Standard transition duration `motion.duration.base` (180ms) with `motion.easing.standard`; nothing in this product should animate longer than `motion.duration.slow` (280ms) — this is a data-entry tool, not a marketing site.
- `prefers-reduced-motion: reduce` (see `design-tokens.json`'s `motion.reducedMotion`): disable slide/scale/parallax transitions entirely; keep only short opacity cross-fades (capped at `motion.duration.fast`, 100ms) and essential loading spinners (which must still be paired with text, never spinning alone as the only signal of progress, per `ux-standard.md`).

## 3. Phone patterns for complex editors

These four patterns are shared building blocks (owned by `packages/ui`), used across the complex-editor screens identified in `ux-flows.md` (grade-scheme bands, S-042; fee plans, M3; exam setup, S-040).

| Pattern | When to use | Behaviour |
|---|---|---|
| **Bottom sheet** | Editing one small, self-contained item pulled out of a longer list (one grade-scheme band, one fee-plan line item, one guardian's contact info) | Slides up from the bottom, covers ≤75% of viewport height on phone, dismissible by swipe-down or an explicit Cancel/Save pair (never swipe-to-dismiss only — must have a tappable escape per `ux-standard.md`'s keyboard/focus rules). Traps focus while open. |
| **Stepper** | A short, strictly-ordered sequence with real dependencies (exam setup wizard, S-040; bulk-import mapping, S-023/S-070) | One step's fields visible at a time, a progress indicator (not color-only — also a "Step 2 of 4" text label), Back/Next buttons pinned above the keyboard (see sticky action bar below). Never more than 6 steps — beyond that, split into a checklist (like the setup checklist, S-017) instead of a single stepper. |
| **Full-screen editor** | Editing something with enough fields that a bottom sheet would feel cramped (grade-scheme band list as a whole, S-042; a single student's full profile, S-021) | Takes over the full viewport (its own "screen" in the navigation sense, with a back action in the header, not a modal overlay) — avoids the double-scroll-container problem a large modal creates on a small phone screen. |
| **Sticky action bar above the keyboard** | Any form where the primary action (Save, Next, Publish) must stay reachable while the on-screen keyboard is open | Pinned to the bottom of the viewport using the visual-viewport-aware technique from `mobile-complete.md` (not plain `position: fixed; bottom: 0`, which iOS Safari and Android keyboards can obscure) — always above the keyboard, never scrolled out of reach, minimum 44px tap height per `ux-standard.md`. |

## 4. Component inventory

Derived from `docs/spec/ux-flows.md` §3's 43-screen inventory. **Shared** = lives in `packages/ui`, used by 2+ screens/features. **Feature-specific** = lives in the owning feature folder (per README §5's workstream paths), built once for its one screen.

For each component: purpose, anatomy, states, sizes, accessibility, and one Bangla microcopy example. States always include default/hover/focus/active/disabled at minimum; loading and error are added where the component can be in those states.

### Shared (`packages/ui`)

**Button**
- Purpose: primary/secondary/destructive actions everywhere.
- Anatomy: label (required), optional leading icon, optional loading spinner replacing the label.
- States: default, hover (pointer devices only — no hover-dependent functionality, `mobile-complete.md`), focus (visible ring using `focusRing` token, 3:1 contrast per §6), active (pressed), disabled (reduced opacity, `aria-disabled`, never just visually greyed with no attribute), loading (spinner + `aria-busy="true"`, label stays in the accessible name so a screen reader doesn't lose context).
- Sizes: `sm` (36px height, secondary/inline actions), `md` (44px height, the default — meets the 44px touch-target minimum on its own), `lg` (52px, primary actions on a wizard's final step).
- Accessibility: role is native `<button>` (or `<a>` styled as button, with correct semantics); accessible name equals visible label, never icon-only without `aria-label`; reachable and activatable by keyboard (Enter/Space).
- Bangla microcopy example: primary button on the publish-confirmation screen (S-046) reads "প্রকাশ করুন" (Publish), not a raw English loanword.

**Input (text/number/phone)**
- Purpose: single-line data entry (names, phone numbers, roll numbers, numeric marks).
- Anatomy: label (always visible above the field, never placeholder-only), input box, optional helper text, optional error text, optional leading/trailing icon.
- States: default, focus, filled, disabled, error (red border + icon + text, not color alone), loading (rare — e.g. checking phone-number availability, shown as a trailing spinner).
- Sizes: one size (44px height) — no size variants needed; width is controlled by the container, not the component.
- Accessibility: `<label for>` association or wrapping label (never a bare placeholder as the only label — placeholders disappear on input and fail WCAG); numeric inputs use `inputmode="numeric"` or `"tel"` so phones show the right keyboard; error text is linked via `aria-describedby` and the field gets `aria-invalid="true"`.
- Bangla microcopy example: phone-number field helper text "১১ সংখ্যার মোবাইল নম্বর দিন" (Enter an 11-digit mobile number).

**Select / Combobox**
- Purpose: choosing one value from a bounded list (class level, section, exam status).
- Anatomy: trigger (shows current value or placeholder), option list (bottom sheet on phone, per §3, popover on desktop).
- States: default, focus, open, disabled, loading (options fetching), empty (no options — states why, not just a blank list).
- Sizes: same as Input (44px trigger height).
- Accessibility: `role="combobox"`/native `<select>` semantics, arrow-key navigation in the open list, `aria-expanded` on the trigger.
- Bangla microcopy example: empty state in the class-level picker before any level exists: "এখনো কোনো স্তর যোগ করা হয়নি" (No class level has been added yet).

**Card**
- Purpose: the primary phone-first layout for list-like data (student cards, result cards, notice cards) — replaces wide tables on phone per `mobile-complete.md`.
- Anatomy: optional leading avatar/icon, title, 1–3 metadata lines, optional trailing status pill or chevron.
- States: default, pressed (if tappable), loading (skeleton shimmer, not a spinner, for card lists), empty (a dedicated empty-state illustration/text, not just "no cards").
- Sizes: one size; density (compact/comfortable) is a page-level setting, not a per-card variant.
- Accessibility: if tappable, the whole card is one focusable/activatable element (not nested interactive children competing for the tap), with an accessible name summarizing the row (e.g. "রুবেল হোসেন, রোল ১২, উপস্থিত" for an attendance card).
- Bangla microcopy example: a result card's status pill reads "প্রকাশিত" (Published) or "খসড়া" (Draft).

**Status pill / badge**
- Purpose: small status indicator (attendance status, exam status, invoice status).
- Anatomy: short text label, background color from the semantic token set (`success`/`warning`/`danger`/`info`), optional leading icon.
- States: static (no interactive states — pills are not buttons); if used as a filter chip, add default/selected/focus.
- Sizes: one size (fits inline with body text, `typeScale.sm`).
- Accessibility: color is never the only signal (icon + text always present, per §2); when used as a live status that changes (e.g. attendance being marked in real time), wrap updates in an `aria-live="polite"` region so screen-reader users hear the change.
- Bangla microcopy example: attendance pills — "উপস্থিত" (Present, success), "অনুপস্থিত" (Absent, danger), "ছুটি" (Leave, info), "বিলম্বে" (Late, warning).

**Bottom navigation / sidebar (shell nav)**
- Purpose: the persistent role-based navigation from `ux-flows.md` §2, built once from the shared `NavItem` registry.
- Anatomy: icon + label per item (both always visible on phone — no icon-only bottom nav, since that fails the "accessible name = visible label" pattern for low-literacy users this product targets), active-state indicator.
- States: default, active/current, disabled (a role sees an item but it's not yet available — should be rare; prefer not showing the item at all per `NavItem.roles` filtering).
- Sizes: fixed height (56px) bottom bar on phone; fixed-width (240px) sidebar on desktop, per §2 of this document.
- Accessibility: current page indicated with `aria-current="page"`, not color alone; each item is a real link (navigable, bookmarkable, back-button-friendly) not a JS-only tab switch.
- Bangla microcopy example: nav labels are the Bangla glosses from `ux-flows.md` §2 — "হোম", "শিক্ষার্থী", "হাজিরা", "পরীক্ষা", "সেটিংস", etc.

**Empty state**
- Purpose: any list/screen with zero data yet (per `ux-standard.md`'s required loading/empty/error states).
- Anatomy: short illustration or icon, one-line explanation, primary action if one exists (e.g. "Add your first student").
- States: static.
- Accessibility: the explanation text must be real content in the DOM (not an image with no alt text carrying the only explanation).
- Bangla microcopy example: empty exam list — "এখনো কোনো পরীক্ষা তৈরি হয়নি। নতুন পরীক্ষা তৈরি করুন।" (No exam has been created yet. Create a new exam.)

**Confirmation dialog**
- Purpose: any destructive or hard-to-reverse action (publish results, delete a student, remove a user) — must state the consequence with real counts per `ux-standard.md`.
- Anatomy: title, body naming the real count/consequence, Cancel + primary action (primary action is never pre-focused if destructive, to avoid an accidental Enter-key confirm).
- States: default, loading (action in progress, buttons disabled during this window to prevent double-submit).
- Accessibility: `role="alertdialog"`, focus moves into the dialog on open and returns to the triggering element on close, Escape closes it (treated as Cancel).
- Bangla microcopy example: publish confirmation body — "এটি ১২০ জন শিক্ষার্থীর ফলাফল, ৩টি শাখায়, প্রকাশ করবে। এই কাজ পরে বাতিল করা যাবে না।" (This will publish results for 120 students across 3 sections. This cannot be undone later.)

**Toast / inline banner**
- Purpose: transient success/error feedback after an action (not for anything the person must act on immediately — that's the confirmation dialog above).
- Anatomy: icon, short message, optional action link (e.g. "Undo").
- States: entering, visible, exiting; error toasts persist longer than success ones (per `ux-standard.md`'s general error-handling expectations).
- Accessibility: `aria-live="polite"` (or `"assertive"` for errors), auto-dismiss timing must be generous enough for a screen-reader user to hear it before it disappears, and never the only record of what happened (the underlying data state itself should reflect the change too).
- Bangla microcopy example: "সংরক্ষণ হয়েছে" (Saved) / "সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন" (Could not save, please try again).

**Data grid / editable grid** (the marks-entry and roll-assignment engine)
- Purpose: the keyboard-first editable grid used by subject-wise marks entry (S-043) and roll assignment (S-025) — the single most important shared interactive component per `munshi-flow-analysis.md` §5's "keyboard-first editable grid becomes a shared component" consequence.
- Anatomy: sticky header row/column (name), one editable cell per student per column, inline validation, a live "n of m entered" counter.
- States: default, focus (per-cell), editing, saved (per-cell subtle confirmation), error (per-cell, validated against `full_marks` before save, never silently clamped), loading (initial fetch), offline (queued, per `mobile-complete.md`'s sync-status requirement).
- Sizes: row height 44px minimum (touch target), column width responsive but never below a legible minimum for Bangla names (per §1's long-name guidance).
- Accessibility: grid semantics (`role="grid"`/`"row"`/`"gridcell"`) with arrow-key navigation between cells, numeric keypad on phone (`inputmode="numeric"`), each cell's accessible name includes the student's name and the column so a screen-reader user always knows what they're editing.
- Bangla microcopy example: the live counter reads "৪০ জনের মধ্যে ১৮ জনের নম্বর দেওয়া হয়েছে" (18 of 40 students' marks entered).

### Feature-specific (owned by the feature's workstream, not `packages/ui`)

| Component | Screen(s) | Owning workstream | Why not shared |
|---|---|---|---|
| Setup checklist | S-017 | WS-WEB | One-off onboarding flow, not reused elsewhere |
| Grade-scheme band editor | S-042 | WS-EXAM | Domain-specific structure (bands, boundaries) not reusable outside exams |
| Exam setup wizard steps | S-040 | WS-EXAM | Built from the shared Stepper pattern (§3) but its step content is exam-specific |
| Marksheet preview/print layout | S-047 | WS-EXAM | A print-specific layout using `--font-print`, not a screen component |
| Bulk-import field-mapping table | S-023, S-070 | WS-ACAD / WS-EXAM (Munshi importer) | Import-specific column-mapping UI, not reused elsewhere |
| Attendance roster (per-section) | S-031 | WS-ACAD | Built from Card/status-pill primitives but its roster logic (present/absent/late/leave toggle group) is attendance-specific |
| Notice audience picker | S-051 | WS-COMM | Domain-specific targeting logic (role/class_level/section) |
| Institution settings form | S-011 | WS-WEB | One screen, unlikely to be reused |
| Platform impersonation banner | S-004 (and shown globally once active) | WS-PLAT | Platform-only concern, never seen by tenant users |

## 5. Content guide

See `docs/spec/content-guide.md` (this task's step 5) for voice/tone, the terminology glossary, and message patterns — kept as a separate file since it is Bangla-first prose, not a technical spec.

## 6. Contrast verification

Every color pair in `design-tokens.json`'s `contrastPairs` list is computed, not eyeballed, by `docs/spec/tools/check-contrast.mjs` (WCAG relative-luminance formula). Run `node docs/spec/tools/check-contrast.mjs` — as of this spec, **28/28 required pairs pass** their threshold (4.5:1 text, 3:1 UI/icons, per `ux-standard.md` §3). Two pairs are marked `required: false` (exempt) and shown for documentation only: `text.disabled` (WCAG explicitly does not require disabled-state contrast) and `accent.base` as a UI-only decorative fill in light mode (it is never used as the sole carrier of information — always paired with the `accent.fg` text token, which does pass at 5.46:1/8.75:1). See the report for the full run output.

## 7. Munshi → SMS mapping: tokens and components (keep, change, drop)

Extends `docs/research/munshi-flow-analysis.md` §4 (token-level "Keep" decision) down to specific component/token choices. **Caveat, stated once and binding throughout this document:** Munshi's actual Tailwind/CSS token values were not shared with this task — the analysis records the *direction* ("gold accent, primary colour, Hind Siliguri/Noto Sans Bengali for UI, SolaimanLipi for results") but no hex codes. Every color value in `design-tokens.json` is therefore this task's own choice in that spirit, verified for contrast, not a literal port of Munshi's palette. If the Owner shares Munshi's real token file later, reconciling it against `design-tokens.json` is a small follow-up, not a redesign.

| Munshi element | SMS decision | Reason |
|---|---|---|
| Gold accent colour (exact value unknown) | **Keep the concept, choose a new value** — `accent.base` (`#C9960C` light / `#FBBF24` dark), paired with a dark `accent.fg` for text-on-gold rather than white-on-gold | A literal port isn't possible without the source value; gold-with-dark-text is a common accessible pattern for warm/yellow accents (white text on mid-tone gold usually fails 4.5:1) |
| Primary/brand colour (exact value unknown) | **Keep the concept (a deep, confident primary), choose a new value** — `primary.base` (`#0F6E51` light / `#34D399` dark) | Same reasoning; a deep green reads as trustworthy/institutional, consistent with common Bangladeshi civic and Islamic-institution palettes, though this is this task's own aesthetic judgement, not a Munshi fact |
| Hind Siliguri + Noto Sans Bengali for UI | **Keep exactly** | Already proven legible for this exact audience; §1 above adopts it directly |
| SolaimanLipi for results/print | **Keep the intent (scope it to print), licence now confirmed** | The audit's reasoning ("so screen and paper match") is sound; `M0-U2` found conflicting third-party licence claims, `M0-O2` resolved it by reading the font's own embedded metadata (SIL OFL 1.1, see §1's table and `docs/spec/fonts/solaimanlipi/README.md`) — no longer blocking |
| "একসাথে যোগ করুন" (bulk-paste add) | **Keep as a pattern**, not a token — carried into S-023's paste path per `ux-flows.md` §5 | Already the right interaction for phone-only student entry |
| Card view on phone for report tables | **Keep** | Already proven; formalised as the shared Card component (§4) |
| Attendance pills | **Keep the concept, restyle with the new semantic tokens** (`success`/`danger`/`info`/`warning`) | The pill pattern is right; the specific colors need to come from this spec's verified palette, not whatever Munshi used, since Munshi's exact values are unknown |
| `HashRouter`-based navigation chrome | **Drop** | Already decided in `munshi-flow-analysis.md` §4 (change to normal history routing); no visual token carries over from a routing mechanism |
| First-run tour UI | **Drop** | Replaced by the setup checklist pattern (§4's Feature-specific table); different component entirely, nothing to carry over visually |

## 8. Open questions

1. ~~SolaimanLipi's actual licence~~ — **Resolved by `M0-O2`**: the font's own embedded metadata (read with `fontTools`, not a third-party mirror) confirms SIL Open Font License 1.1 for the 2022/v2.002 release, which is what's bundled at `docs/spec/fonts/solaimanlipi/`. See §1's table and that folder's `README.md` for the full provenance note. Not a substitute for a lawyer's sign-off before a paying customer sees it (per `M0-O2` step 2), but no longer a blocker for `M2-E4` to proceed against.
2. **Munshi's real token values** — if the Owner can share Munshi's Tailwind config or a screenshot with a color picker, §7's "choose a new value" rows could become literal ports instead of new choices; not blocking, but would make the "shared feel" goal from the task's own context note more literal.
3. Whether platform_owner-facing screens (S-003–S-006) need their own, more data-dense visual density variant (the Card component's "density" setting mentioned in §4) given that role's likely-desktop-leaning usage (an open question already raised in `ux-flows.md` §7).
