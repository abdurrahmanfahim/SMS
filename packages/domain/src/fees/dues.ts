import type { IsoDate } from "../dates.js";
import type { Poisha } from "../money.js";

/** Stored status of an invoice. */
export type InvoiceStatus = "open" | "partially_paid" | "paid" | "void";

/** Outcome of {@link invoiceStatus}. */
export type InvoiceStatusResult =
  | { readonly ok: true; readonly status: InvoiceStatus }
  | { readonly ok: false; readonly reason: "invalid_amounts" };

/**
 * The status an invoice should have: `void` if voided, `paid` once `paidTotal` reaches `total`
 * (including a zero total), `partially_paid` when something but not everything is paid, otherwise
 * `open`. `paidTotal` above `total`, negatives and fractions are `invalid_amounts`.
 */
export function invoiceStatus(input: {
  readonly total: Poisha;
  readonly paidTotal: Poisha;
  readonly void: boolean;
}): InvoiceStatusResult {
  const { total, paidTotal } = input;
  const valid =
    Number.isSafeInteger(total) &&
    Number.isSafeInteger(paidTotal) &&
    total >= 0 &&
    paidTotal >= 0 &&
    paidTotal <= total;
  if (!valid) return { ok: false, reason: "invalid_amounts" };
  if (input.void) return { ok: true, status: "void" };
  if (paidTotal >= total) return { ok: true, status: "paid" };
  return { ok: true, status: paidTotal > 0 ? "partially_paid" : "open" };
}

/** An invoice as needed for dues (`total`, `paid_total`, `due_date`, `status`). */
export type DueInvoice = {
  readonly id: string;
  readonly dueDate: IsoDate;
  readonly total: Poisha;
  readonly paidTotal: Poisha;
  readonly status: InvoiceStatus;
};

/** Aging bucket by days past the due date. `not_due` means the due date is still ahead. */
export type AgingBucket = "not_due" | "0-30" | "31-60" | "61+";

/** Outcome of {@link computeDues}. */
export type DuesResult =
  | {
      readonly ok: true;
      /** Everything still owed on non-void invoices: `notDue` plus the three buckets. */
      readonly totalDue: Poisha;
      readonly notDue: Poisha;
      readonly buckets: {
        readonly days0to30: Poisha;
        readonly days31to60: Poisha;
        readonly days61plus: Poisha;
      };
      /** Invoices with something open, in input order. */
      readonly invoices: readonly {
        readonly id: string;
        readonly open: Poisha;
        readonly daysPastDue: number;
        readonly bucket: AgingBucket;
      }[];
    }
  | {
      readonly ok: false;
      readonly reason: "invalid_invoice" | "out_of_range";
      readonly id?: string;
    };

const DAY_MS = 86_400_000;

function dayNumber(date: IsoDate): number {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/**
 * Dues and aging as of `asOf` (spec §3): for every non-void invoice the open amount is
 * `total - paidTotal`. Invoices due after `asOf` are `not_due`; the others fall in `0-30`,
 * `31-60` or `61+` days past due (an invoice due today has 0 days past due and lands in `0-30`).
 * `totalDue` always equals the sum of `notDue` and the buckets.
 *
 * Fails with `invalid_invoice` for a negative or fractional amount or when `paidTotal` exceeds
 * `total`, and with `out_of_range` if a sum leaves the safe integer range.
 */
export function computeDues(invoices: readonly DueInvoice[], asOf: IsoDate): DuesResult {
  const today = dayNumber(asOf);
  let notDue = 0n;
  let d0 = 0n;
  let d31 = 0n;
  let d61 = 0n;
  const rows: { id: string; open: Poisha; daysPastDue: number; bucket: AgingBucket }[] = [];
  for (const invoice of invoices) {
    const { total, paidTotal } = invoice;
    if (
      !Number.isSafeInteger(total) ||
      !Number.isSafeInteger(paidTotal) ||
      total < 0 ||
      paidTotal < 0 ||
      paidTotal > total
    ) {
      return { ok: false, reason: "invalid_invoice", id: invoice.id };
    }
    const open = total - paidTotal;
    if (invoice.status === "void" || open === 0) continue;
    const daysPastDue = today - dayNumber(invoice.dueDate);
    let bucket: AgingBucket;
    if (daysPastDue < 0) {
      bucket = "not_due";
      notDue += BigInt(open);
    } else if (daysPastDue <= 30) {
      bucket = "0-30";
      d0 += BigInt(open);
    } else if (daysPastDue <= 60) {
      bucket = "31-60";
      d31 += BigInt(open);
    } else {
      bucket = "61+";
      d61 += BigInt(open);
    }
    rows.push({ id: invoice.id, open: open as Poisha, daysPastDue, bucket });
  }
  const totalDue = notDue + d0 + d31 + d61;
  if (totalDue > BigInt(Number.MAX_SAFE_INTEGER)) return { ok: false, reason: "out_of_range" };
  return {
    ok: true,
    totalDue: Number(totalDue) as Poisha,
    notDue: Number(notDue) as Poisha,
    buckets: {
      days0to30: Number(d0) as Poisha,
      days31to60: Number(d31) as Poisha,
      days61plus: Number(d61) as Poisha,
    },
    invoices: rows,
  };
}
