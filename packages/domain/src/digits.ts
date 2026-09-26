/** Code point of BENGALI DIGIT ZERO (U+09E6); the ten Bangla digits follow it in order. */
const BN_ZERO = 0x09e6;

/**
 * Replaces every Bangla digit (০–৯, U+09E6–U+09EF) in `input` with the matching ASCII digit.
 * Every other character is left untouched, so it is safe to run on any text.
 *
 * @example bnToAscii("৳ ১২৩.৫০") // "৳ 123.50"
 */
export function bnToAscii(input: string): string {
  return input.replace(/[\u09E6-\u09EF]/g, (digit) => String(digit.charCodeAt(0) - BN_ZERO));
}

/**
 * Replaces every ASCII digit (0–9) in `input` with the matching Bangla digit.
 * Every other character is left untouched, so it is safe to run on any text.
 *
 * @example asciiToBn("Roll 42") // "Roll ৪২"
 */
export function asciiToBn(input: string): string {
  return input.replace(/[0-9]/g, (digit) => String.fromCharCode(BN_ZERO + Number(digit)));
}

/**
 * Cleans up a number a person typed so it is ready for a strict parser such as `parseTaka`.
 *
 * Converts Bangla digits to ASCII, then removes internal whitespace and grouping commas
 * (Bangladeshi numerals group as lakh/crore — `১২,৩৪,৫৬৭` — but still use a plain `.` for the
 * decimal point and `,` for grouping, the same punctuation as ASCII; there is no separate Bangla
 * decimal or thousands-separator character). A leading `+` or `-` sign is left in place.
 *
 * This function only normalizes digit script and punctuation — it does not check that the result
 * is a well-formed number. Pass the result to `parseTaka` (or `Number.parseFloat`) to validate and
 * convert it; garbage in still produces a string, just one with plain digits and no separators.
 *
 * @example normalizeNumericInput("১,২৫০.৫০") // "1250.50"
 * @example normalizeNumericInput(" ১ ২৫০ ") // "1250"
 */
export function normalizeNumericInput(input: string): string {
  return bnToAscii(input).replace(/[,\s]/g, "");
}
