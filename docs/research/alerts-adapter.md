# `alerts` adapter interface — requirements

Derived from the providers shortlisted in `providers.md` (Swift SMS Sender as primary, Bulk SMS BD as fallback, plus the general pattern seen across sms.bd, MiM SMS and Khudebarta). This is a **requirements list for a future coding task**, not an implementation — no code is written by this task (out of scope, section 5.3).

Per **D-08**, the provider sits behind an adapter interface with a per-institution credit ledger, so the application code never talks to a specific vendor's API directly.

## Why these three methods
Every provider reviewed exposes, in some form: a way to submit a message for sending, a way to know what happened to it, and a way to check remaining credit before sending (since these are prepaid, recharge-based accounts, not postpaid). That maps to three adapter methods.

## Method 1 — `send`
**Purpose:** submit one text alert for delivery.
**Inputs (all providers need some version of these):**
- `to`: destination phone number, Bangladeshi format (needs normalisation — providers reviewed did not state a single accepted format).
- `body`: the message text (Bangla or English; the adapter, not the provider, must decide Unicode vs GSM-7 encoding based on content, per the segment math in `providers.md`).
- `sender_type`: `masking` or `non-masking` — every provider reviewed distinguishes these as separate products/rates, so the caller must choose explicitly rather than relying on a provider default.
- `sender_id`: required when `sender_type = masking` (the approved brand-name sender ID); not applicable for non-masking.
- `institution_id`: **not** sent to the provider — used locally to debit the correct institution's credit ledger (per D-08's "per-institution credit ledger" requirement) before/after the provider call.
- `idempotency_key`: not explicitly documented by any provider reviewed, but recommended locally regardless — needed to avoid double-sending on retry, since none of the providers' pages describe built-in de-duplication.
**Outputs:**
- `provider_message_id`: an ID to correlate with a later delivery-status query/webhook (every provider that mentions delivery reports implies some form of per-message reference, though none document its exact shape publicly).
- `segments_billed`: the segment count the provider says it charged, if returned synchronously — needed to reconcile against the adapter's own segment-counting logic, since billing "unit" (per segment vs per message) was **unknown** for most providers reviewed and must be confirmed with the chosen vendor.
- `status`: at minimum `queued` / `rejected`, since submission and final delivery are not the same event for any of these providers.

## Method 2 — `get_status` (and/or a status webhook)
**Purpose:** find out whether a sent alert was actually delivered.
**Inputs:** `provider_message_id` (from `send`).
**Outputs:** a delivery state — at minimum `delivered` / `failed` / `pending`, since MiM SMS and Khudebarta both advertise "real-time delivery reports" as a feature, implying the underlying data exists, but neither page documents the exact states or webhook payload shape (**unknown**, confirm with chosen vendor's API docs before implementation).
**Design note:** because webhook support is **unknown** for the primary recommendation (Swift SMS Sender), the adapter interface should support both a push (`on_status_webhook(payload)`) and a pull (`get_status(provider_message_id)`) path, and treat the webhook as an optimisation over polling rather than a hard dependency — this keeps the fallback provider swappable even if its webhook support turns out to differ.

## Method 3 — `get_balance`
**Purpose:** read remaining prepaid credit, both at the vendor account level and reconciled against our own per-institution ledger.
**Inputs:** none (account-level) or `institution_id` (for our own ledger balance, computed locally — not from the vendor).
**Outputs:** `vendor_balance_segments_or_bdt` (whatever unit the vendor reports — every provider reviewed is prepaid/recharge-based, so this exists in some form, but the exact API shape is **unknown** and provider-specific) and, separately, `institution_ledger_balance` (purely local bookkeeping, decremented by `segments_billed` from every `send` call attributed to that institution).

## Cross-cutting requirements (not one method, but shape the whole adapter)
- **Encoding decision lives in the adapter, not the provider call site:** since Bangla text costs roughly 2.3x more per character than English (67 vs 153 chars/segment when concatenated, per `providers.md`), the adapter should expose a `estimate_segments(body)` helper so calling code (and the cost model in `cost-model.md`) can predict cost before sending, not just after.
- **Masking-approval status is a slow, manual, out-of-band process** (lead time **unknown** for every provider reviewed) — the adapter should treat `sender_id` availability as a configuration value set after manual approval completes, not something the adapter itself can request synchronously.
- **Multi-provider from day one, per D-08:** the interface must not leak provider-specific fields (e.g. a Swift-SMS-Sender-only parameter) into the calling code, since D-08 explicitly defers the final vendor choice past this task and expects the fallback (Bulk SMS BD) to be swappable in.
- **BTRC content rule:** MiM SMS's page cites a BTRC notice (2019-01-03) that promotional SMS must be in Bengali. The adapter or the calling code should have a `message_category` (`transactional` vs `promotional`) so this rule can be enforced for promotional sends specifically, without over-constraining transactional alerts (attendance, fees) that are not promotional.
