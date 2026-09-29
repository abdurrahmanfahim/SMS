# ADR 0005 — Performance budget

**Status:** Accepted (task M0-W1) · **Decisions in force:** D-06, D-14 · **Spec:** `docs/spec/ux-standard.md` (Core Web Vitals targets)

## Context

The product targets low-end Android phones on slow networks. The field targets at the 75th percentile are LCP at most 2.5 s, INP at most 200 ms and CLS at most 0.1. Field data does not exist before launch, so CI checks lab proxies and a byte budget that keeps the shell small enough to meet them.

## Budgets

| What                          | Budget                                                                                                       | How it is enforced                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Initial JS of the shell route | at most **200 KB gzip**                                                                                      | `apps/web/scripts/bundle-budget.mjs`, run at the end of `pnpm --filter @sms/web build`, so the root `pnpm build` in CI fails when it is exceeded |
| Initial CSS                   | at most **40 KB gzip**                                                                                       | same script                                                                                                                                      |
| Lab LCP                       | at most **2.5 s** on slow 4G (1.6 Mbps down, 150 ms RTT) with 4x CPU throttling, 360 px viewport, cold cache | `e2e/web/perf.spec.ts` (Playwright with CDP throttling)                                                                                          |
| Lab CLS                       | at most **0.1** in the same run                                                                              | same test                                                                                                                                        |
| INP                           | at most 200 ms (field target; no reliable lab proxy yet)                                                     | measured in the field after launch; feature tasks keep handlers light                                                                            |
| Tap targets                   | at least **44 x 44 px**                                                                                      | `e2e/web/shell.spec.ts` (touch targets test)                                                                                                     |

"Initial" means the files that `dist/index.html` loads before the first screen: module scripts, modulepreloads and stylesheets. Lazy route chunks and fonts are not counted; fonts are subsetted and loaded on demand by `unicode-range` (see ADR 0004).

## Current numbers (M0-W1)

Measured at the end of this task on the production build:

- Initial JS: 127.9 KB gzip (budget 200 KB), one file.
- Initial CSS: 5.0 KB gzip (budget 40 KB), one file.
- Lab LCP (Playwright, slow 4G, 4x CPU, 360 px): 2112 to 2388 ms across three runs after the font preload was added (1560 ms before it, when CLS was 0.28), CLS 0.000. Budgets 2500 ms and 0.1. Headroom is thin.
- Lighthouse 13.5.0, default mobile simulation: performance 92, accessibility 100, best practices 100, LCP 2.9 s, CLS 0, TBT 80 ms. Lighthouse's simulated LCP is above the 2.5 s target; it is recorded here as debt, not enforced in CI (the Playwright test is the enforced proxy).

## Font preload and layout shift

`apps/web/vite.config.ts` preloads the Bangla 400 and Latin 400 font files. Without it the header text first painted in the fallback font and reflowed when Hind Siliguri arrived, giving CLS 0.28 (above the 0.1 budget). The 600 weight is not preloaded to save bandwidth on slow networks.

## Rules for later tasks

- Feature routes are loaded lazily (`lazy()` inside `register.ts`) so the initial bundle stays under budget; adding a feature must not grow the initial JS.
- Do not raise a budget to make a build pass. Raising one needs a new ADR that says why.
- The check reads `dist/index.html`, so it works for any future chunking strategy.

## Consequences

- A regression fails `pnpm build` locally and in CI with a message naming the exceeded budget.
- The lab LCP test runs in the web e2e suite and depends on CI machine speed; if it turns flaky the fix is to widen the measured margin in the test, not to drop the check.
