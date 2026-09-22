# Text-alert and payment providers — Bangladesh

Access date for every source below: 2026-09-23 (desk research only; no account was created and no one was paid, per task boundaries). Facts not confirmed by a public source are marked **unknown**, not guessed.

## SMS segment math (background, not vendor-specific)
This is standard GSM/3GPP encoding behaviour (industry-wide, not one vendor's claim), relevant because our alerts are mostly Bangla:
- **English (GSM-7):** 160 chars in a single segment; 153 chars per segment once a message is long enough to need concatenation (multi-part).
- **Bangla (Unicode/UCS-2):** 70 chars in a single segment; 67 chars per segment once concatenated.
- Cost model implication: a Bangla template that is 71–134 characters already costs **2 segments**, not 1. Every provider below bills per segment sent, not per "message" — verify this billing unit with the chosen provider's own docs before committing, since none of the marketing pages found here state segment-billing rules explicitly (**unknown** per-provider confirmation).

---

## Text-alert providers (5)

### 1. sms.bd
- **URL / access date:** https://sms.bd/ and https://sms.bd/Pricing/ — 2026-09-23
- **Price per segment:** Tiered "recharge more, pay less" pricing with separate masking and non-masking rates; exact BDT/SMS figures are on a slider tool on the pricing page and were not resolved to fixed numbers from the page content retrieved — **unknown** exact rate, but the model (declining marginal cost with recharge size) is confirmed.
- **Unicode handling:** States Unicode support for Bangla and other scripts.
- **API style:** Has its own API plus a WordPress plugin.
- **Delivery reports / webhooks:** **unknown** — not stated on the pages retrieved.
- **Sender-ID/masking approval + lead time:** Offers both masking and non-masking; approval process/lead time **unknown**.
- **Minimum top-up:** **unknown**.
- **Content terms:** **unknown** beyond general masking/non-masking split.
- **Support:** Phone (09613 250 260, stated hours 9am–9pm) and live chat.

### 2. MiM SMS (mimsms.com)
- **URL / access date:** https://www.mimsms.com/ — 2026-09-23
- **Price per segment:** **unknown** (not published on the page retrieved).
- **Unicode handling:** States automatic language detection and correct encoding selection for Bangla vs English SMS.
- **API style:** Has an SMS API/gateway; also has low-balance alerting.
- **Delivery reports / webhooks:** States real-time reporting; webhook support **unknown**.
- **Sender-ID/masking approval + lead time:** Offers both masking and non-masking; lead time **unknown**. Notes a **BTRC regulation** (notice dated 2019-01-03) that promotional SMS must be sent in Bengali — relevant compliance constraint for any promotional (not transactional) text we might send.
- **Minimum top-up:** **unknown**.
- **Content terms:** Promotional content must be in Bengali per the cited BTRC notice.
- **Support:** **unknown** beyond general marketing claims; states it serves schools among its client types.

### 3. Bulk SMS BD (bdbulksms.com)
- **URL / access date:** https://bdbulksms.com/ — 2026-09-23
- **Price per segment:** Starts at ৳0.30/SMS (advertised headline rate).
- **Unicode handling:** States Bangla support.
- **API style:** Own API plus WordPress and WooCommerce plugins.
- **Delivery reports / webhooks:** States an "inbox facility"; explicit delivery-report/webhook support **unknown**.
- **Sender-ID/masking approval + lead time:** Offers both masking and non-masking, non-masking sent via a dedicated SMPP; approval lead time **unknown**.
- **Minimum top-up:** **unknown**.
- **Content terms:** **unknown**.
- **Support:** States 99.99% uptime and "professional support"; operating since 2015, own gateway/data centre in Bangladesh.

### 4. Swift SMS Sender (astgd.com)
- **URL / access date:** https://astgd.com/swift-sms-sender — 2026-09-23
- **Price per segment:** Starts at ৳0.35/SMS non-masking and ৳0.65/SMS masking (headline rates; volume/operator can change this).
- **Unicode handling:** Not explicitly detailed on this page; masking vs non-masking split is Unicode-agnostic in the pricing shown — **unknown** whether Bangla Unicode is billed differently from these headline rates.
- **API style:** Has an SMS API/gateway product line.
- **Delivery reports / webhooks:** **unknown**.
- **Sender-ID/masking approval + lead time:** Masking needs sender-ID/brand-name approval per the page; lead time **unknown**. States operation through licensed aggregator partners connected to Grameenphone, Robi, Banglalink and Teletalk, and compliance with BTRC regulation.
- **Minimum top-up:** **unknown**, but notably accepts **bKash, Nagad, Rocket, bank transfer and card** for top-up with instant crediting after payment — the most locally-convenient top-up method found among the providers reviewed.
- **Content terms:** BTRC-compliant per the page.
- **Support:** **unknown** beyond the page's general claims.

### 5. Khudebarta
- **URL / access date:** https://khudebarta.com/blog/non-masking-sms-pricing-in-bangladesh-a-complete-guide — 2026-09-23
- **Price per segment:** Tiered non-masking plans, e.g. a "Basic" plan at ৳0.34/SMS for 2,500 SMS, down to ৳0.31/SMS on a "Platinum" plan (54,054 SMS for BDT 20,000) — i.e. bigger prepaid packages lower the per-segment cost, same pattern as sms.bd.
- **Unicode handling:** States Bangla SMS support.
- **API style:** States API integration for software/website integration.
- **Delivery reports / webhooks:** States real-time delivery reports; webhook support **unknown**.
- **Sender-ID/masking approval + lead time:** This source only documents non-masking pricing; masking terms **unknown** from this page.
- **Minimum top-up:** Smallest package found is 2,500 SMS (~BDT 850 at ৳0.34/SMS).
- **Content terms:** **unknown**.
- **Support:** **unknown**.

**Two more names surfaced but not detailed here (kept for the Owner's awareness, not fully vetted):** ZAMAN IT (zaman-it.com, advertises from ৳0.25/SMS) and CoderSys (codersys.com, advertises ৳0.25–0.50/SMS by tier and type). Same caveats apply — headline rates only, no confirmed segment-billing or approval-lead-time detail.

---

## Payment providers (5)

### 1. bKash (direct merchant / payment gateway)
- **URL / access date:** https://www.bkash.com/en/business and https://bizmend.com/blog/bkash-merchant-account-register-and-get-payment/ — 2026-09-23
- **Merchant documents needed:** NID, valid trade license (license number + expiry), business bank account, and a live website or app for the online-business/API route.
- **Fees:** Not published as a fixed rate; bKash's own T&Cs state "additional fee may be applicable on the payment amount" based on merchant agreement — **unknown** exact %.
- **Checkout/API style:** Tokenized checkout, subscription payments, direct charges, B2C payout APIs; also Merchant QR and counter payment for in-person collection. bKash's own page explicitly mentions education fee collection and disbursement (grants/scholarships) as a supported use case.
- **Settlement time:** **unknown** (not published).
- **Refund support:** States "instant refunds" as a feature; exact process/fees **unknown**.

### 2. Nagad (direct merchant)
- **URL / access date:** https://paymentproviders.io/compare/nagad-vs-a-pay — 2026-09-23 (secondary/aggregator comparison source, not Nagad's own site — marked secondary)
- **Merchant documents needed:** **unknown** from this secondary source; likely similar KYC to bKash (NID, trade license, bank account) but not confirmed here.
- **Fees:** Secondary source states "1.30% for merchants" as Nagad's standard transaction rate — **treat as an estimate**, not confirmed on Nagad's own site.
- **Checkout/API style:** Own payment gateway APIs exist (third-party PHP/Laravel SDKs found on Packagist/GitHub confirm a documented merchant API with merchant ID/public/private key auth); webhook support stated as available by the same secondary comparison source.
- **Settlement time:** Same secondary source states "Instant" — **unconfirmed** on Nagad's own site, treat as estimate.
- **Refund support:** **unknown**.

### 3. SSLCommerz (aggregator)
- **URL / access date:** https://bengalcloud.com/best-payment-gateway-in-bangladesh/ — 2026-09-23
- **Merchant documents needed:** Trade license, TIN, NID, business bank account, and website Terms & Conditions / Privacy Policy / Refund Policy pages.
- **Fees:** Setup fee BDT 25,500 (non-refundable, Basic Plan), no monthly fee; transaction fee from 2.5% for local cards and MFS (bKash/Nagad/Rocket/Upay bundled through one integration), 3.5% for Amex. (A second, older/secondary source puts SSLCommerz's setup fee at BDT 15,000 with a 2.5% card rate and 2–4% for mobile/internet banking — the two sources disagree on the exact setup fee, so treat BDT 15,000–25,500 as the range and confirm directly before committing.)
- **Checkout/API style:** REST API, instant sandbox, official plugins for WooCommerce/Shopify/Magento/WHMCS, SDKs for PHP/Laravel/Node.js/Android/iOS.
- **Settlement time:** Approval time 3–7 working days for onboarding; ongoing settlement **unknown** from this source (a different secondary source elsewhere commonly cites T+1 to T+2, not independently confirmed here).
- **Refund support:** Standard, per merchant agreement; exact fee **unknown**.

### 4. AamarPay (aggregator)
- **URL / access date:** https://unb.com.bd/news/tag/83232 and https://paymentproviders.io/compare/aamarpay-vs-a-pay?focus=fees — 2026-09-23 (both secondary sources; no official AamarPay pricing page was found in this search)
- **Merchant documents needed:** **unknown** from these sources (likely similar trade-license/NID/bank-account KYC common to BD gateways, but not confirmed for AamarPay specifically).
- **Fees:** Four plans (SME, B2B, Enterprise, Corporate) with setup fees reported between BDT 4,000–15,000 depending on plan; a separate comparison site states a transaction rate of 1.85%–2.75% depending on plan/method.
- **Checkout/API style:** Supports bKash, Rocket, SureCash, Visa, MasterCard, Amex and more; API and plugins available; BDT only (no stated multi-currency support).
- **Settlement time:** **unknown**.
- **Refund support:** **unknown**.

### 5. ShurjoPay (aggregator)
- **URL / access date:** https://unb.com.bd/category/business/renowned-online-payment-gateways-in-bangladesh-for-domestic-international-transactions/74554 and https://help.ezycourse.com/article/shurjopay-payment-gateway — 2026-09-23
- **Merchant documents needed:** Onboarding is by contacting ShurjoPay directly through a merchant form; they issue a payment URL, username and password once requirements are met (specific document list **unknown** from these sources).
- **Fees:** One of the first Bangladesh Bank PSO-licensed gateways. Notably publishes a **discounted "education" tier**: sign-up + integration fee BDT 15,000 for education platforms (vs BDT 20,000 for corporate), card fee 1.5% for education (vs 2.5% corporate), net-banking fee 2% for education (vs 3.5% corporate), no annual maintenance fee. A separate source (2026) cites a flat BDT 15,500 setup charge without breaking out an education rate — the two sources disagree on the exact figure, so confirm directly before committing.
- **Checkout/API style:** Accepts cards plus bKash, Nagad and Rocket through one integration.
- **Settlement time:** **unknown**.
- **Refund support:** **unknown**.

## Sources noted as secondary (per task instructions, not to be relied on alone)
`paymentproviders.io`, `unb.com.bd` (tag/aggregation pages) and `bengalcloud.com`/`inai.io` blog posts are third-party comparison sites, not the providers' own pricing pages. Every fee/lead-time figure sourced only from one of these is flagged above; before signing with any provider, re-confirm the number on that provider's own current pricing page or by direct enquiry (which is out of this task's scope, per section 5.3).

---

## Recommendation for D-08 (text-alert provider)

**Primary recommendation: Swift SMS Sender (astgd.com).** Reasoning from the desk research above only (no provider was contacted, so this is provisional):
- It is the only provider found that publishes both masking and non-masking rates side by side (৳0.35 non-masking / ৳0.65 masking) with no volume commitment stated, which fits an early-stage product that does not yet know its real alert volume.
- It explicitly accepts **bKash, Nagad, Rocket, bank transfer and card** for top-up with instant crediting — this matters because we will already be integrating at least one of these wallets for D-09-adjacent bookkeeping, so the operational overhead of topping up SMS credit is lower than for a bank-transfer-only provider.
- It states operation through BTRC-licensed aggregator partners connected to all four major Bangladeshi operators (Grameenphone, Robi, Banglalink, Teletalk), which is a basic compliance/deliverability signal.
- Weakness: delivery-report/webhook support and masking-approval lead time are **unknown** from the public page — this must be confirmed directly (by the Owner, not this agent, per boundaries) before committing.

**Fallback: Bulk SMS BD (bdbulksms.com).** Reasoning: publishes a clear headline rate (from ৳0.30/SMS), has operated since 2015 with its own gateway and data centre (a maturity signal), and separates masking from non-masking delivery via a dedicated SMPP for non-masking — useful if Swift SMS Sender's approval process or webhook support turns out to be inadequate.

**Because D-08 explicitly puts the provider behind an adapter interface with a per-institution credit ledger (see the alerts adapter requirements below), switching providers later is a configuration change, not a rebuild — so this recommendation is safe to revisit after real usage data from the M0 interviews and an early pilot.**

### Owner action list (with lead times and required documents)
Everything below needs the Owner (a human) to do — this task explicitly excludes creating accounts or paying anyone.

1. **Contact Swift SMS Sender and Bulk SMS BD directly** to confirm: exact per-segment pricing at our expected volume, delivery-report/webhook availability, and masking sender-ID approval lead time. Lead time: **unknown** until contacted (not published).
2. **Prepare masking (sender-ID) approval documents** — likely trade license and possibly a BTRC-related declaration, based on the general pattern seen across BD SMS vendors; the exact list is **unknown** until confirmed with the chosen vendor. Budget at least a few business days for approval based on how such approvals are generally described in the industry, but treat this as unconfirmed.
3. **For payments, contact SSLCommerz first** (most complete single-integration coverage of bKash/Nagad/Rocket/cards found in this research) to get an exact quote; required documents per the source found: **trade license, TIN, NID, business bank account, and website Terms & Conditions / Privacy Policy / Refund Policy pages** — get these drafted in advance since M2/M3 will need the SSLCommerz-style aggregator eventually even though D-09 defers online payments to M5.
4. **Ask ShurjoPay specifically about its "education" pricing tier** (1.5% card fee, 2% net-banking fee, BDT 15,000 sign-up per one 2026 source) — if genuine and still current, this is meaningfully cheaper than the corporate rate and worth a direct quote before M5 planning begins.

---

## Alerts adapter interface — requirements (step 4)

See the dedicated file `docs/research/alerts-adapter.md` for the full requirements (methods, inputs, outputs) derived from the providers shortlisted above.
