import type { IsoDate } from "../dates.js";
import type { Poisha } from "../money.js";

import { compareIds } from "./order.js";
import { type Waiver, applyWaivers } from "./waivers.js";

/** How often a plan item is billed (`fee_plan_items.frequency`). */
export type FeeFrequency = "monthly" | "term" | "once" | "per_exam";

/** One line of a fee plan (`fee_plan_items`). `months` are calendar months 1 to 12, or `null`. */
export type PlanItem = {
  readonly id: string;
  readonly feeHeadId: string;
  readonly descriptionBn: string;
  readonly amount: Poisha;
  readonly frequency: FeeFrequency;
  /** Day of the month the item falls due (1 to 31; clamped to the month's length), or `null`. */
  readonly dueDay: number | null;
  readonly months: readonly number[] | null;
  readonly sortOrder: number;
};

/** A billing period: a calendar month (`2026-10`) or a term (`term-1`). */
export type InvoicePeriod =
  | { readonly kind: "month"; readonly year: number; readonly month: number }
  | { readonly kind: "term"; readonly term: number };

/** Input of {@link calculateInvoiceLines}. */
export type InvoiceLinesInput = {
  readonly period: InvoicePeriod;
  readonly items: readonly PlanItem[];
  /** Per fee head amount replacing the plan amount (`student_fee_assignments.overrides`). */
  readonly overrides?: Readonly<Record<string, Poisha>>;
  readonly waivers?: readonly Waiver[];
  /** Date used to decide which waivers are in force (normally the invoice issue date). */
  readonly issueDate: IsoDate;
  /**
   * Ids of `once` or `per_exam` items to bill in this run. Those two frequencies have no natural
   * period, so they are billed only when listed here.
   */
  readonly includeItemIds?: readonly string[];
};

/** One invoice line (`invoice_items`): `amount` is after the waiver. */
export type InvoiceLine = {
  readonly itemId: string;
  readonly feeHeadId: string;
  readonly descriptionBn: string;
  readonly gross: Poisha;
  readonly waiverAmount: Poisha;
  readonly amount: Poisha;
};

/** Outcome of {@link calculateInvoiceLines}. */
export type InvoiceLinesResult =
  | {
      readonly ok: true;
      /** `2026-10` or `term-1`, the value stored in `invoices.period`. */
      readonly period: string;
      readonly lines: readonly InvoiceLine[];
      readonly gross: Poisha;
      readonly waiver: Poisha;
      /** Invoice total: the sum of the line amounts after waivers. */
      readonly total: Poisha;
      /** Earliest item due day in a month period, as a date; `null` for terms or no due day. */
      readonly dueDate: IsoDate | null;
    }
  | {
      readonly ok: false;
      readonly reason:
        | "invalid_period"
        | "invalid_item"
        | "duplicate_item_id"
        | "invalid_override"
        | "invalid_waiver"
        | "unknown_include_item";
      /** Item id or fee head involved, when there is one. */
      readonly id?: string;
    };

/** The string stored in `invoices.period`, or `null` when the period is not valid. */
export function periodKey(period: InvoicePeriod): string | null {
  if (period.kind === "term") {
    return Number.isInteger(period.term) && period.term >= 1 ? `term-${period.term}` : null;
  }
  const { year, month } = period;
  if (!Number.isInteger(year) || year < 1000 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function itemIsValid(item: PlanItem): boolean {
  if (!Number.isSafeInteger(item.amount) || item.amount < 0) return false;
  if (
    item.dueDay !== null &&
    (!Number.isInteger(item.dueDay) || item.dueDay < 1 || item.dueDay > 31)
  ) {
    return false;
  }
  return item.months === null || item.months.every((m) => Number.isInteger(m) && m >= 1 && m <= 12);
}

/**
 * Whether the periodic rules include `item` in `period`:
 * `monthly` items are billed every month (or only in their `months`); `term` items are billed in
 * every term period, and in a month period only if that month is listed in `months`;
 * `once` and `per_exam` items never match a period (see `includeItemIds`).
 */
function matchesPeriod(item: PlanItem, period: InvoicePeriod): boolean {
  if (item.frequency === "once" || item.frequency === "per_exam") return false;
  if (period.kind === "term") return item.frequency === "term";
  const listed = item.months !== null && item.months.includes(period.month);
  return item.frequency === "monthly" ? item.months === null || listed : listed;
}

function dueDateIn(year: number, month: number, dueDay: number): IsoDate {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` as IsoDate;
}

/**
 * Works out the lines and total of one student's invoice for one period (spec §3):
 * picks the plan items whose frequency and months match (plus any `includeItemIds`), replaces the
 * amount by the student's per-head override if there is one, applies the waivers in force on
 * `issueDate` (percent waivers in basis points, half up to a poisha) and totals the result.
 * Lines are ordered by `sortOrder`, then item id, so the output is deterministic.
 *
 * Idempotence (one invoice per student and period) is the caller's job (unique
 * `(institution_id, enrollment_id, period)`). Problems in the input come back as a `reason`.
 */
export function calculateInvoiceLines(input: InvoiceLinesInput): InvoiceLinesResult {
  const period = periodKey(input.period);
  if (period === null) return { ok: false, reason: "invalid_period" };

  const seen = new Set<string>();
  for (const item of input.items) {
    if (seen.has(item.id)) return { ok: false, reason: "duplicate_item_id", id: item.id };
    seen.add(item.id);
    if (!itemIsValid(item)) return { ok: false, reason: "invalid_item", id: item.id };
  }
  for (const [feeHeadId, amount] of Object.entries(input.overrides ?? {})) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      return { ok: false, reason: "invalid_override", id: feeHeadId };
    }
  }
  const forced = new Set(input.includeItemIds ?? []);
  for (const id of forced) {
    if (!seen.has(id)) return { ok: false, reason: "unknown_include_item", id };
  }

  const chosen = input.items
    .filter((item) => matchesPeriod(item, input.period) || forced.has(item.id))
    .sort((a, b) => a.sortOrder - b.sortOrder || compareIds(a.id, b.id));

  const lines: InvoiceLine[] = [];
  let gross = 0;
  let waived = 0;
  for (const item of chosen) {
    const base = (input.overrides?.[item.feeHeadId] ?? item.amount) as Poisha;
    const result = applyWaivers(base, input.waivers ?? [], item.feeHeadId, input.issueDate);
    if (!result.ok) return { ok: false, reason: "invalid_waiver", id: item.id };
    lines.push({
      itemId: item.id,
      feeHeadId: item.feeHeadId,
      descriptionBn: item.descriptionBn,
      gross: base,
      waiverAmount: result.waiver,
      amount: result.net,
    });
    gross += base;
    waived += result.waiver;
  }

  const dueDays = chosen.flatMap((item) => (item.dueDay === null ? [] : [item.dueDay]));
  const dueDate =
    input.period.kind === "month" && dueDays.length > 0
      ? dueDateIn(input.period.year, input.period.month, Math.min(...dueDays))
      : null;
  return {
    ok: true,
    period,
    lines,
    gross: gross as Poisha,
    waiver: waived as Poisha,
    total: (gross - waived) as Poisha,
    dueDate,
  };
}
