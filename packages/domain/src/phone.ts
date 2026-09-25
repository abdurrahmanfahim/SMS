import { bnToAscii } from "./digits.js";

/**
 * A Bangladeshi mobile number in canonical E.164 form: `+880` followed by the 10-digit national
 * number (`1` then an operator digit 3–9 then eight more digits), e.g. `+8801712345678`.
 *
 * Build values with {@link normalizeBdPhone}; the brand stops a plain, unvalidated `string` from
 * being passed where a checked phone number is expected.
 */
export type BdMobileE164 = string & { readonly __brand: "BdMobileE164" };

/** Outcome of {@link normalizeBdPhone}. */
export type PhoneResult =
  | { readonly ok: true; readonly e164: BdMobileE164 }
  | {
      readonly ok: false;
      readonly reason: "empty" | "invalid_characters" | "invalid_prefix" | "unrecognized_format";
    };

// Full national number, `1` + operator digit (3-9) + 8 more digits — the part that follows the
// country code in every accepted form.
const NATIONAL_NUMBER = "1[3-9]\\d{8}";
const LOCAL = new RegExp(`^0(${NATIONAL_NUMBER})$`); // 01XXXXXXXXX
const INTL_NO_PLUS = new RegExp(`^880(${NATIONAL_NUMBER})$`); // 8801XXXXXXXXX
const INTL_PLUS = new RegExp(`^\\+880(${NATIONAL_NUMBER})$`); // +8801XXXXXXXXX

// Same three shapes, but without the 3-9 restriction on the operator digit — used only to tell
// "wrong prefix digit" apart from "not a Bangladeshi mobile number at all" for a clearer reason.
const LOCAL_SHAPE = /^0\d{10}$/;
const INTL_NO_PLUS_SHAPE = /^880\d{10}$/;
const INTL_PLUS_SHAPE = /^\+880\d{10}$/;

/**
 * Normalizes a Bangladeshi mobile number to canonical E.164 form.
 *
 * Accepts the local form (`01XXXXXXXXX`), the international form with or without a leading `+`
 * (`8801XXXXXXXXX`, `+8801XXXXXXXXX`), Bangla digits, and spaces or dashes anywhere. Validates that
 * the operator digit is 3–9 (prefixes 013–019); other prefixes and non-mobile numbers (landlines,
 * short codes) are rejected.
 *
 * The result is idempotent: normalizing an already-normalized `e164` value returns the same value.
 *
 * @example normalizeBdPhone("01712-345678") // { ok: true, e164: "+8801712345678" }
 * @example normalizeBdPhone("০১৭ ১২৩৪৫৬৭৮") // { ok: true, e164: "+8801712345678" }
 * @example normalizeBdPhone("01212345678") // { ok: false, reason: "invalid_prefix" }
 */
export function normalizeBdPhone(input: string): PhoneResult {
  const cleaned = bnToAscii(input).trim();
  if (cleaned === "") return { ok: false, reason: "empty" };
  if (!/^\+?[\d\s-]+$/.test(cleaned)) return { ok: false, reason: "invalid_characters" };

  const digits = cleaned.replace(/[\s-]/g, "");
  const match = LOCAL.exec(digits) ?? INTL_NO_PLUS.exec(digits) ?? INTL_PLUS.exec(digits);
  if (match !== null) {
    const nationalNumber = match[1] as string; // the group always participates on a successful match
    return { ok: true, e164: `+880${nationalNumber}` as BdMobileE164 };
  }

  const wrongPrefixOnly =
    LOCAL_SHAPE.test(digits) || INTL_NO_PLUS_SHAPE.test(digits) || INTL_PLUS_SHAPE.test(digits);
  return { ok: false, reason: wrongPrefixOnly ? "invalid_prefix" : "unrecognized_format" };
}
