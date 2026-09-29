import type { IsoDate } from "../dates.js";
import type { Poisha } from "../money.js";

/** An invoice that can receive money: `openAmount` is `total - paid_total` (never for a void one). */
export type OpenInvoice = {
  readonly id: string;
  readonly number: string;
  readonly dueDate: IsoDate;
  readonly openAmount: Poisha;
};

/** Where a payment goes: the oldest open invoices, or only the invoices the collector picked. */
export type AllocationMode =
  | { readonly kind: "oldest_first" }
  | { readonly kind: "chosen"; readonly invoiceIds: readonly string[] };

/** Input of {@link allocatePayment}. */
export type AllocationInput = {
  /**
   * The money to place, in poisha: a new payment, or the unallocated remainder (advance credit) of
   * an earlier payment being applied to newer invoices.
   */
  readonly amount: Poisha;
  readonly invoices: readonly OpenInvoice[];
  readonly mode: AllocationMode;
};

/** Outcome of {@link allocatePayment}. */
export type AllocationResult =
  | {
      readonly ok: true;
      /** One row per invoice that received money (`payment_allocations`), oldest first. */
      readonly allocations: readonly { readonly invoiceId: string; readonly amount: Poisha }[];
      readonly allocated: Poisha;
      /** Money left over: the student's advance credit. */
      readonly advance: Poisha;
      /** Every invoice with its open amount after this allocation, oldest first. */
      readonly remaining: readonly { readonly invoiceId: string; readonly openAmount: Poisha }[];
    }
  | {
      readonly ok: false;
      readonly reason:
        | "invalid_amount"
        | "invalid_open_amount"
        | "duplicate_invoice"
        | "unknown_invoice"
        | "duplicate_chosen_invoice";
      readonly id?: string;
    };

const byAge = (a: OpenInvoice, b: OpenInvoice): number => {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (a.number !== b.number) return a.number < b.number ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/**
 * Splits a payment across invoices (spec §3). In `oldest_first` mode the invoices are paid in
 * order of due date (then invoice number, then id) until the money runs out; in `chosen` mode only
 * the listed invoices receive money, again oldest first among them. An invoice never receives more
 * than its open amount and the total allocated never exceeds `amount`; whatever is left is
 * returned as `advance` (advance credit). Invoices with nothing open get no row.
 *
 * Fails with `invalid_amount` unless `amount` is a positive safe integer, `invalid_open_amount`
 * for a negative or fractional open amount, `duplicate_invoice` for a repeated invoice id,
 * `unknown_invoice` for a chosen id that is not among `invoices`, and `duplicate_chosen_invoice`
 * for a chosen id listed twice.
 */
export function allocatePayment(input: AllocationInput): AllocationResult {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }
  const known = new Set<string>();
  for (const invoice of input.invoices) {
    if (known.has(invoice.id)) return { ok: false, reason: "duplicate_invoice", id: invoice.id };
    known.add(invoice.id);
    if (!Number.isSafeInteger(invoice.openAmount) || invoice.openAmount < 0) {
      return { ok: false, reason: "invalid_open_amount", id: invoice.id };
    }
  }
  let chosen: Set<string> | null = null;
  if (input.mode.kind === "chosen") {
    chosen = new Set<string>();
    for (const id of input.mode.invoiceIds) {
      if (!known.has(id)) return { ok: false, reason: "unknown_invoice", id };
      if (chosen.has(id)) return { ok: false, reason: "duplicate_chosen_invoice", id };
      chosen.add(id);
    }
  }

  let left = input.amount as number;
  const allocations: { invoiceId: string; amount: Poisha }[] = [];
  const remaining: { invoiceId: string; openAmount: Poisha }[] = [];
  for (const invoice of [...input.invoices].sort(byAge)) {
    const eligible = chosen === null || chosen.has(invoice.id);
    const give = eligible ? Math.min(left, invoice.openAmount) : 0;
    if (give > 0) allocations.push({ invoiceId: invoice.id, amount: give as Poisha });
    left -= give;
    remaining.push({ invoiceId: invoice.id, openAmount: (invoice.openAmount - give) as Poisha });
  }
  return {
    ok: true,
    allocations,
    allocated: (input.amount - left) as Poisha,
    advance: left as Poisha,
    remaining,
  };
}
