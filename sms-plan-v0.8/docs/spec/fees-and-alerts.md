# Fees, text alerts and guardian portal spec v0 (task M3-L1)

Conventions from `domain-model.md` §1 apply (tenant keys, `institution_id`, audit, integer money in poisha). Everything here is a first cut for M3; details that need real pilot input are listed in §8. Online payments are out of v1 (D-09): money is recorded, not moved.

## 1. Principles

- Financial records are append-only: a wrong payment is voided with a reason and a new one posted; nothing is edited or deleted.
- Receipt and invoice numbers are sequential per institution per year; a void keeps its number.
- No card or wallet credentials are ever stored. A payment stores method and a free-text reference (for example a bKash transaction ID).
- Alerts never send without a valid recipient, a positive credit balance and passing the rules in §5.

## 2. Fee tables (owner: WS-FIN)

- `fee_heads`: `id`, `institution_id`, `name_bn`, `name_en`, `kind` (`recurring|one_time|per_exam`), `default_amount bigint null`, `active`.
- `fee_plans`: `id`, `institution_id`, `academic_year_id`, `class_level_id null` (null = all classes), `name`, `active`. Unique `(institution_id, academic_year_id, class_level_id, name)`.
- `fee_plan_items`: `id`, `institution_id`, `fee_plan_id`, `fee_head_id`, `amount bigint`, `frequency` (`monthly|term|once|per_exam`), `due_day smallint null`, `months smallint[] null`, `sort_order`.
- `student_fee_assignments`: `institution_id`, `enrollment_id`, `fee_plan_id`, `overrides jsonb null` (per head amount), `starts_on`, `ends_on null`. Without a row a student gets the plan matching their class.
- `waivers`: `id`, `institution_id`, `enrollment_id`, `fee_head_id null` (null = all heads), `kind` (`percent|fixed`), `value bigint` (percent in basis points 0 to 10000, or poisha), `reason`, `starts_on`, `ends_on null`, `approved_by_membership_id`.
- `invoices`: `id`, `institution_id`, `enrollment_id`, `number` (for example `INV-2026-000123`), `period` (`2026-10` or `term-1`), `issue_date`, `due_date`, `status` (`open|partially_paid|paid|void`), `total bigint`, `paid_total bigint` (maintained by function), `created_by`. Unique `(institution_id, enrollment_id, period)` so bulk generation is idempotent.
- `invoice_items`: `id`, `institution_id`, `invoice_id`, `fee_head_id`, `description_bn`, `amount bigint` (after waiver), `waiver_amount bigint default 0`.
- `payments`: `id`, `institution_id`, `receipt_no` (for example `RCPT-2026-000045`), `enrollment_id`, `received_on date`, `amount bigint`, `method` (`cash|bkash|nagad|rocket|bank|other`), `reference null`, `received_by_membership_id`, `status` (`posted|void`), `void_reason null`, `voided_by null`.
- `payment_allocations`: `institution_id`, `payment_id`, `invoice_id`, `amount bigint`. The sum of allocations of a payment is at most its amount; the remainder is advance credit for that student.
- `fee_period_locks`: `institution_id`, `period`, `locked_at`, `locked_by`. No posting or voiding in a locked period without an admin unlock (audited).

## 3. Fee rules

- **Invoice generation:** per class and period, idempotent, skips existing invoices, includes plan items whose frequency and months match, applies waivers. Percent waivers use basis points and round half up to a poisha.
- **Allocation:** a payment is allocated to the oldest open invoices first unless the collector picks specific ones. Invoice `status` and `paid_total` follow the allocations of posted payments.
- **Dues:** for a student, the sum of `total − paid_total` over non-void invoices. Aging buckets: 0–30, 31–60, 61 and more days past due.
- **Numbering:** `private.next_number(institution, kind, year)` under an advisory lock so two accountants never get the same number.
- **Late fees:** not in v1.
- **Receipts and invoices as PDF:** same template pipeline as marksheets (M2-E4); shared from the phone.
- **Reports:** daily collection (by method and receiver), collection by class and head, dues aging, defaulter list; export as PDF and CSV. Totals must equal the sum of posted receipts.

## 4. Alert tables (owner: WS-COMM)

- `text_templates`: `id`, `institution_id`, `key` (`absent_alert|fee_due|result_published|notice|custom`), `body_bn` with variables such as `{student_name}`, `{date}`, `{amount}`, `{institution}`, `{link}`, `active`. Defaults live in `@sms/domain` and are copied per institution.
- `text_outbox`: `id`, `institution_id`, `template_key`, `to_e164`, `guardian_id null`, `student_id null`, `body` (rendered), `segments int`, `encoding` (`gsm7|ucs2`), `credits int`, `status` (`queued|sending|sent|delivered|failed|blocked`), `provider_message_id null`, `attempts int`, `next_attempt_at null`, `error_code null`, `scheduled_for null`, `dedupe_key text`, `created_by`. Unique `(institution_id, dedupe_key)`, for example `absent:<student>:<date>`.
- Credits use `text_credit_ledger` (M1-P3): reserve on queue (negative delta with the outbox id as `ref`), refund on definitive failure (positive delta). Insufficient credits set `blocked` and show a clear message.

## 5. Alert rules (D-18, defaults the Owner can change)

- Only to guardians with `receive_alerts` and a valid E.164 phone.
- Quiet hours 21:00 to 07:00 Asia/Dhaka: scheduled messages wait until morning.
- Dedupe by `dedupe_key`; rate limit per institution per minute.
- Bangla text is sent as UCS-2, which fits about 70 characters in a single segment and about 67 per segment when concatenated (English GSM-7: 160 and 153; verify with the chosen provider). `countSegments(text)` in `@sms/domain` drives the cost preview. Templates aim for one segment.
- Bulk sends show segments, recipients and total credits and need a confirmation.
- Teachers cannot send free-form messages in v1; notices and the automatic alerts cover their needs.
- Triggers: absent alert when attendance is finalised, fee-due reminders on configured days (for example 3 days before the due date and 7 days after), result published, optional notice broadcast.
- Provider adapter (from `M0-R2`): `send(to, text, { senderId, ref })` returns provider id and segments; status webhook maps provider states to `sent|delivered|failed`; `balance()`. A fake provider ships for tests.
- Worker: Edge Function on a schedule with backoff (1 min, 5 min, 30 min, 2 h; at most 5 attempts); webhooks update delivery.

## 6. Guardian portal (owner: WS-COMM, `apps/web/src/features/parent/**`)

- Access: invite link (M1-P2) sets a password; one account may link several children, even across institutions; child switcher; language toggle; install guide.
- Read-only views: today's attendance and a calendar; published results per exam with marksheet download and share; dues and receipts; notices.
- No push notification in v1 (iPhone limits, see `mobile-complete.md`); text alerts are the channel.
- A guardian sees only linked children and only published data (RLS). Designed for low digital confidence: large text, few steps, Bangla only by default.

## 7. Permissions added to the matrix

Fee structure, invoices, payments, allocations, locks: admin and accountant manage; teachers none; guardians read their own children's invoices and receipts. Text templates and outbox: admin manage and read; accountant reads outbox; teachers none; guardians none. Credit ledger: platform owner writes, admin reads. See `permissions.md`.

## 8. Open questions for pilots

1. Partial payments and advance payments: how common? Any installment plans?
2. Sibling discounts, scholarships and free-ship rules.
3. Hostel and transport as monthly heads: same model or special?
4. Refund rules; who may void; is a second approver needed?
5. Late fees: needed at all?
6. Which alerts do guardians actually want; opt-out mechanism; sender name approvals.
7. Do institutions want receipts on paper (thermal printer) as well?
