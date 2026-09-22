# Monthly running-cost model

Access date for every priced source below: 2026-09-23. Exchange rate used throughout: **1 USD = 123 BDT** (mid-market rate, sourced 2026-09-23 via https://www.clock7.com/currency/usd-to-bdt/, close to the ~122–123 range seen across several rate trackers checked the same day). All BDT figures below are converted at this fixed rate for comparability; re-check the rate before using this model for a real budget, since it moves daily.

Every number in the CSV (`cost-model.csv`) is tagged `sourced` (from a provider page/pricing calculator retrieved this session), `estimate` (a reasoned guess, clearly flagged, where no public number was found), or `unknown` (left blank on purpose, with a note on how to find out). **Do not treat `estimate` rows as confirmed prices.**

## Scenario definition
- Institution counts: **10, 50, 200**, each with **400 students** (fixed, per task instructions) → 4,000 / 20,000 / 80,000 students total.
- For each institution count, three cases — **Low, Base, High** — vary by SMS volume/mix/price and by infra headroom, not by institution count (institution count is a separate axis, giving 9 scenarios total in the CSV).

## Line items and how each is priced

### 1. Database & auth (Supabase)
- **Sourced:** Pro plan is $25/month per organization; a $10/month compute credit is bundled and covers one Micro compute instance; database storage overage beyond the 8 GB bundled is $0.125/GB/month. (https://makerkit.dev/blog/md/saas/supabase-pricing, https://focusreactive.com/blog/supabase-price/ — 2026-09-23)
- **Estimate:** the price of the *next* compute tier above Micro was not found in this search (Supabase's own pricing page was not directly retrieved). Where the model needs a compute upsize (Base/High at 50 and 200 institutions), a placeholder step of **+$25** and **+$60** is used and marked `estimate` — confirm the real Small/Medium compute add-on price on Supabase's pricing page before budgeting against this.

### 2. Storage & bandwidth (Supabase file storage + egress)
- **Sourced:** Pro bundles 100 GB file storage and 250 GB egress/month. Overage beyond that is not itemised from this search — treated as `estimate` at Base/High for the larger institution counts (marksheet PDFs and photos start to add up).

### 3. Hosting (Netlify)
- **Sourced:** Pro plan is $20/month (unlimited members) with 3,000 credits/month bundled; bandwidth costs roughly 20 credits/GB, so the bundle covers on the order of 150 GB/month before overage; extra credit packs cost about $10 per 1,500 credits. (https://makerkit.dev/pricing-calculator/netlify, https://hackceleration.com/labs/netlify-pricing — 2026-09-23)

### 4. PDF worker (marksheets, admit cards)
- **Sourced:** DigitalOcean Basic Droplets: $6/month (1 GB RAM), $12/month (2 GB), $24/month (4 GB), $48/month (8 GB). (https://www.temperstack.com/plans/digitalocean/ — 2026-09-23)
- **Assumption:** headless-Chromium PDF rendering (marksheets, admit cards, receipts) needs a small always-on worker rather than a serverless function, because rendering time and memory for a batch of marksheets can exceed typical serverless limits — this is a design assumption for M2/M3, not yet decided in a spec, so flagged under "Decisions others depend on" in the report.

### 5. Monitoring (Sentry)
- **Sourced:** Developer (free) plan exists; Team is $26/month; Business is $80/month. (https://costbench.com/software/developer-tools/sentry — 2026-09-23, a third-party pricing aggregator, marked secondary)

### 6. Backups
- Supabase Pro already bundles 7-day daily backups in the base $25/month fee (no extra line at Low/Base). Point-in-time recovery (needed once an institution's data matters enough that a day of loss is unacceptable) is a paid Supabase add-on; **its price was not found in this search — `unknown`, left blank in the High case, and flagged as a follow-up**.

### 7. Text alerts (three template lengths)
Uses the Bangla/English segment math from `providers.md`. Three template lengths are modelled:
- **Short** (≤70 chars, e.g. a one-line absence notice): 1 segment.
- **Medium** (71–134 chars, e.g. absence + fee-due combined): 2 segments.
- **Long** (>134 chars, e.g. a subject-wise result summary): modelled at ~250 chars → 4 segments (67 chars/segment once concatenated).

| Case | Alerts sent per student per month | Template mix (short/medium/long) | Weighted avg segments/alert | Price per segment used |
|---|---|---|---|---|
| Low | 1 | 100% short | 1.0 | ৳0.25 (lowest headline rate found, ZAMAN IT) |
| Base | 3 | 60% / 30% / 10% | 1.6 | ৳0.30 (Bulk SMS BD headline non-masking rate) |
| High | 6 | 40% / 40% / 20% | 2.0 | ৳0.55 (blended masking/non-masking, near Swift SMS Sender's ৳0.65 masking rate) |

These alert-rate and template-mix numbers are **assumptions**, not measured — we have no usage data yet (that is exactly what M0-O1's interviews and a real pilot will tell us). They are written down explicitly here so the Leader can adjust them once real numbers exist.

### 8. Payment fees
Per **D-09** (v1 = manual fee entry and receipts; online payments in M5), there is **no online-payment integration in v1**, so this line is **$0 in all nine scenarios**. Once M5 adds online payments, re-run this model with a transaction-fee line from `providers.md` (SSLCommerz ~2.5%, AamarPay ~1.85–2.75%, ShurjoPay ~1.5% education rate, all of GMV processed online — GMV is not something this task estimates).

## Totals (USD/month, rounded)

| Institutions | Low | Base | High |
|---|---|---|---|
| 10 | $59 | $98 | $313 (+ unknown backup add-on) |
| 50 | $92 | $332 | $1,243 (+ unknown backup add-on) |
| 200 | $256 | $1,102 | $4,681 (+ unknown backup add-on) |

Full line-by-line numbers, in both BDT and USD, are in `cost-model.csv`.

## The 3 inputs that move the cost most
1. **Text-alert volume and mix (alerts/student/month × segment length).** This is the largest single line at every institution count and case — it grows from ~14% of the Low/10-institution total to over 90% of the High/200-institution total. Bangla's Unicode segment limit (70/67 chars) means a "long" template can cost 4x a "short" one for the same alert; template design (keeping alerts under 70 chars where possible) is a real lever on cost, not just a UX nicety.
2. **Institution/student count (linear scale).** Every per-student line (text alerts) and most per-institution-count infra lines scale roughly linearly with institutions — going from 10 to 200 institutions is a 20x multiplier on students, and the model's totals scale by roughly that factor.
3. **SMS price per segment, especially masking vs non-masking.** The High case uses a masking-leaning blended rate (৳0.55) against the Low case's non-masking headline rate (৳0.25) — more than 2x — so the choice of masking (brand-name sender ID, likely wanted for trust) vs non-masking (cheaper, numeric sender) is itself a major cost lever, separate from volume.

## Reproducing this model
`cost-model.csv` is long-format: one row per (institutions × case × line_item), with `unit_price_bdt`/`unit_price_usd`, `quantity`, the resulting `monthly_cost_usd`, a `confidence` tag (`sourced`/`estimate`/`unknown`), and a `note` with the formula or source. To change an assumption (e.g. a different alerts/student/month figure once real data exists), edit the relevant `quantity` or `unit_price` cells and recompute `monthly_cost_usd = unit_price × quantity` for that row; the totals in this file are a manual sum of the CSV rows per (institutions, case) and would need updating too.
