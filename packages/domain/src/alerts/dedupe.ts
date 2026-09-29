import type { IsoDate } from "../dates.js";

/** Outcome of a dedupe key builder. */
export type DedupeKeyResult =
  | { readonly ok: true; readonly key: string }
  | { readonly ok: false; readonly reason: "invalid_part" };

/**
 * A key part is 1 to 100 characters with no `:` and no whitespace or control characters, so that
 * different inputs can never build the same key.
 */
const PART = /^[^\s:]{1,100}$/u;

function isValidPart(part: string): boolean {
  return (
    PART.test(part) &&
    Array.from(part).every((ch) => {
      const code = ch.codePointAt(0) as number;
      return code > 0x1f && code !== 0x7f;
    })
  );
}

function build(kind: string, parts: readonly string[]): DedupeKeyResult {
  if (!parts.every(isValidPart)) return { ok: false, reason: "invalid_part" };
  return { ok: true, key: [kind, ...parts].join(":") };
}

/** Key of an absent alert (`absent:<student>:<date>`): one per student and day. */
export function absentDedupeKey(studentId: string, date: IsoDate): DedupeKeyResult {
  return build("absent", [studentId, date]);
}

/**
 * Key of a fee reminder (`fee_due:<invoice>:<offset>`), where `offsetDays` is days relative to the
 * due date (`-3` = 3 days before, `7` = 7 days after). Must be an integer from -365 to 365.
 */
export function feeDueDedupeKey(invoiceId: string, offsetDays: number): DedupeKeyResult {
  if (!Number.isInteger(offsetDays) || offsetDays < -365 || offsetDays > 365) {
    return { ok: false, reason: "invalid_part" };
  }
  return build("fee_due", [invoiceId, offsetDays < 0 ? `m${-offsetDays}` : `p${offsetDays}`]);
}

/** Key of a result-published alert (`result:<publication>:<student>`) for one snapshot version. */
export function resultPublishedDedupeKey(
  publicationId: string,
  studentId: string,
): DedupeKeyResult {
  return build("result", [publicationId, studentId]);
}

/** Key of a notice text to one guardian (`notice:<notice>:<guardian>`). */
export function noticeDedupeKey(noticeId: string, guardianId: string): DedupeKeyResult {
  return build("notice", [noticeId, guardianId]);
}
