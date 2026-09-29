/** Kind of numbered document: invoices are `INV`, receipts are `RCPT` (spec §2). */
export type DocumentKind = "invoice" | "receipt";

const PREFIX: Record<DocumentKind, string> = { invoice: "INV", receipt: "RCPT" };

/** Outcome of {@link formatDocumentNumber}. */
export type FormatNumberResult =
  | { readonly ok: true; readonly number: string }
  | { readonly ok: false; readonly reason: "invalid_year" | "invalid_sequence" };

/**
 * Formats a per-institution, per-year sequence number: `INV-2026-000123` for invoices and
 * `RCPT-2026-000045` for receipts. `year` must be a 4-digit year (1000 to 9999) and `sequence` an
 * integer from 1 to 999999 (six digits, zero-padded).
 */
export function formatDocumentNumber(
  kind: DocumentKind,
  year: number,
  sequence: number,
): FormatNumberResult {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    return { ok: false, reason: "invalid_year" };
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999999) {
    return { ok: false, reason: "invalid_sequence" };
  }
  return { ok: true, number: `${PREFIX[kind]}-${year}-${String(sequence).padStart(6, "0")}` };
}

/** Outcome of {@link parseDocumentNumber}. */
export type ParseNumberResult =
  | {
      readonly ok: true;
      readonly kind: DocumentKind;
      readonly year: number;
      readonly sequence: number;
    }
  | { readonly ok: false; readonly reason: "invalid_format" };

const NUMBER_PATTERN = /^(INV|RCPT)-(\d{4})-(\d{6})$/;

/** Reads a number produced by {@link formatDocumentNumber}; anything else is `invalid_format`. */
export function parseDocumentNumber(text: string): ParseNumberResult {
  const match = NUMBER_PATTERN.exec(text);
  if (match === null) return { ok: false, reason: "invalid_format" };
  const sequence = Number(match[3]);
  if (sequence < 1) return { ok: false, reason: "invalid_format" };
  return {
    ok: true,
    kind: match[1] === "INV" ? "invoice" : "receipt",
    year: Number(match[2]),
    sequence,
  };
}
