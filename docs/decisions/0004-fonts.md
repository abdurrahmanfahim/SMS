# ADR 0004 — Bangla web fonts, self-hosted

**Status:** Accepted (task M0-W1) · **Decisions in force:** D-03, D-14 · **Spec:** `docs/spec/design-system.md` §1

## Decision
The UI uses **Hind Siliguri** as the primary font with **Noto Sans Bengali** as glyph fallback. Both are served from our own origin as woff2 files; no font CDN is called at run time (privacy, CSP, offline).

Font stack (`--font-bangla`, generated from the design tokens):

```
"Hind Siliguri", "Noto Sans Bengali", -apple-system, "Segoe UI", Roboto, sans-serif
```

## Files and subsetting
The files come from the npm packages `@fontsource/hind-siliguri` and `@fontsource/noto-sans-bengali` (both 5.3.0), which ship each weight already split into a **Bengali** and a **Latin** subset. `apps/web/src/app/fonts.css` declares only those subsets, in woff2 only, with `unicode-range` so the browser downloads a file only when a page uses characters from it, and `font-display: swap` so text is visible with the fallback stack while a font loads.

| Face | Weights | Subsets | Size (woff2) |
|---|---|---|---|
| Hind Siliguri | 400, 500, 600 | bengali, latin | about 71 to 75 KB (bengali), about 15 KB (latin) per weight |
| Noto Sans Bengali | 400 | bengali | about 44 KB |

Weights follow the design system: 400 body, 500 labels, 600 buttons and headings. No 700 for Bangla body text.

## Licences
| Font | Licence | Copyright holder | Evidence |
|---|---|---|---|
| Hind Siliguri | SIL Open Font License 1.1 | Indian Type Foundry (2015) | `LICENSE` inside `@fontsource/hind-siliguri`; package field `"license": "OFL-1.1"` |
| Noto Sans Bengali | SIL Open Font License 1.1 | The Noto Project Authors | package field `"license": "OFL-1.1"` in `@fontsource/noto-sans-bengali` |

OFL 1.1 allows use, embedding and redistribution in commercial products, including self-hosting, as long as the fonts are not sold on their own and the licence text stays with the font files. The fonts are unmodified, and the licence text ships inside the npm packages we depend on.

## Not included
**SolaimanLipi** (planned for printed marksheets only) is **not** shipped: its licence is unclear (`docs/spec/design-system.md` §1, open question 1). PDF and print fonts belong to `M0-S1` and `M2-E4`.

## Numbers and dates
Numbers and dates are formatted with `Intl` in `apps/web/src/shared/format.ts` (`bn-BD`, Bangla numbering system `beng`, or `latn` for ASCII digits), never with a hand-made digit map. Values stay ASCII in storage and inputs. Numbers always use the `bn-BD` locale so grouping is the Bangladeshi lakh pattern (12,34,567) in both languages; dates use the UI language for month names and the `Asia/Dhaka` time zone.

## Consequences
- Fonts add to the precached app shell (see ADR 0005 for the budget). Only the subsets a page needs are downloaded.
- Updating a font means updating the npm package version and re-checking this table.
- A visual check with real conjuncts (`বিদ্যালয়`, `শিক্ষার্থী`, `রাষ্ট্রীয়`) is part of the shell screenshots in the task report.
