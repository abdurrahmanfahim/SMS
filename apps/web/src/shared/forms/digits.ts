import { bnToAscii, normalizeNumericInput } from "@sms/domain/src/digits";

/**
 * Digit helpers for form fields. They wrap the shared domain helpers so every field converts
 * Bangla digits to ASCII the same way. (M1-D1 has landed, so nothing here is a stopgap.)
 */

/** Converts Bangla digits to ASCII while typing. Length never changes, so the caret stays put. */
export function asciiWhileTyping(input: string): string {
  return bnToAscii(input);
}

/** Result of reading a numeric field. */
export type NumericParse = { ok: true; value: number } | { ok: false; reason: "empty" | "invalid" };

/** Reads what a person typed as a number: Bangla or ASCII digits, spaces and grouping commas allowed. */
export function parseNumericInput(raw: string): NumericParse {
  const cleaned = normalizeNumericInput(raw);
  if (cleaned === "") return { ok: false, reason: "empty" };
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return { ok: false, reason: "invalid" };
  const value = Number(cleaned);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false, reason: "invalid" };
}

/** Cleans a numeric field's text on blur: ASCII digits, no spaces or commas. */
export function cleanNumericText(raw: string): string {
  return normalizeNumericInput(raw);
}
