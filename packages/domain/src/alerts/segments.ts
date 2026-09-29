/**
 * Message length limits of an SMS provider, in encoding units: GSM-7 septets (an extension
 * character such as `{` or `€` takes 2) or UCS-2 (UTF-16) code units. Build one with
 * {@link parseSegmentLimits} or use {@link DEFAULT_SEGMENT_LIMITS}.
 */
export type SegmentLimits = {
  readonly gsm7Single: number;
  readonly gsm7Multi: number;
  readonly ucs2Single: number;
  readonly ucs2Multi: number;
  readonly __valid: true;
};

/** The usual limits: GSM-7 160 and 153, UCS-2 70 and 67 (spec §5; verify with the provider). */
export const DEFAULT_SEGMENT_LIMITS: SegmentLimits = {
  gsm7Single: 160,
  gsm7Multi: 153,
  ucs2Single: 70,
  ucs2Multi: 67,
  __valid: true,
};

/** Outcome of {@link parseSegmentLimits}. */
export type SegmentLimitsResult =
  | { readonly ok: true; readonly limits: SegmentLimits }
  | { readonly ok: false; readonly reason: "invalid_limit" | "multi_exceeds_single" };

/**
 * Validates provider limits: each must be an integer of at least 2 (so any single character fits)
 * and a multi-part limit cannot exceed its single-message limit.
 */
export function parseSegmentLimits(input: {
  readonly gsm7Single: number;
  readonly gsm7Multi: number;
  readonly ucs2Single: number;
  readonly ucs2Multi: number;
}): SegmentLimitsResult {
  const values = [input.gsm7Single, input.gsm7Multi, input.ucs2Single, input.ucs2Multi];
  if (!values.every((value) => Number.isInteger(value) && value >= 2)) {
    return { ok: false, reason: "invalid_limit" };
  }
  if (input.gsm7Multi > input.gsm7Single || input.ucs2Multi > input.ucs2Single) {
    return { ok: false, reason: "multi_exceeds_single" };
  }
  return {
    ok: true,
    limits: {
      gsm7Single: input.gsm7Single,
      gsm7Multi: input.gsm7Multi,
      ucs2Single: input.ucs2Single,
      ucs2Multi: input.ucs2Multi,
      __valid: true,
    },
  };
}

// GSM 03.38 default alphabet (1 septet each) and its extension table (2 septets each).
const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
);
const GSM_EXTENSION = new Set("\f^{}\\[~]|€");

/** How a text is encoded on the wire. */
export type SmsEncoding = "gsm7" | "ucs2";

/** Result of {@link countSegments}. */
export type SegmentCount = {
  readonly encoding: SmsEncoding;
  /** Characters (Unicode code points) in the text. */
  readonly characters: number;
  /** Encoding units used: septets for GSM-7, UTF-16 code units for UCS-2. */
  readonly units: number;
  /** Messages the text is split into; 0 for an empty text. */
  readonly segments: number;
  /** Units that still fit in the last segment before another one is needed. */
  readonly charsLeft: number;
};

/**
 * Detects the encoding and counts the segments of a message.
 *
 * Text made only of GSM 03.38 characters is `gsm7`, anything else (all Bangla text) is `ucs2`. A
 * text that fits `single` units is one segment; longer text is split into segments of `multi`
 * units, packing characters greedily so an extension character or a surrogate pair (an emoji) is
 * never cut in two. `charsLeft` is the room left in the last segment (an empty text has none
 * used: 0 segments and a full single message left). The text is counted as given; run it through
 * `renderTemplate` first to get the NFC form that is actually sent.
 *
 * @example countSegments("Fee due tomorrow") // gsm7, 1 segment, charsLeft 144
 */
export function countSegments(
  text: string,
  limits: SegmentLimits = DEFAULT_SEGMENT_LIMITS,
): SegmentCount {
  const chars = Array.from(text);
  const gsm7 = chars.every((ch) => GSM_BASIC.has(ch) || GSM_EXTENSION.has(ch));
  const weigh = (ch: string): number =>
    gsm7 ? (GSM_EXTENSION.has(ch) ? 2 : 1) : (ch.codePointAt(0) as number) > 0xffff ? 2 : 1;
  const weights = chars.map(weigh);
  const units = weights.reduce((sum, weight) => sum + weight, 0);
  const single = gsm7 ? limits.gsm7Single : limits.ucs2Single;
  const multi = gsm7 ? limits.gsm7Multi : limits.ucs2Multi;
  const encoding: SmsEncoding = gsm7 ? "gsm7" : "ucs2";
  const base = { encoding, characters: chars.length, units };

  if (units === 0) return { ...base, segments: 0, charsLeft: single };
  if (units <= single) return { ...base, segments: 1, charsLeft: single - units };

  let segments = 1;
  let used = 0;
  for (const weight of weights) {
    if (used + weight > multi) {
      segments += 1;
      used = 0;
    }
    used += weight;
  }
  return { ...base, segments, charsLeft: multi - used };
}
