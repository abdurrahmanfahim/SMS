import { getLocale, type Locale } from "./i18n";

/** Digit system for display. Values are stored as ASCII; this only changes how they are shown. */
export type Digits = "bn" | "latn";

export const DHAKA_TIME_ZONE = "Asia/Dhaka";

/** Bangla language shows Bangla digits by default, English shows ASCII digits. */
export function defaultDigits(locale: Locale = getLocale()): Digits {
  return locale === "bn" ? "bn" : "latn";
}

/**
 * BCP 47 tag with an explicit numbering system. Numbers always use `bn-BD` so grouping follows
 * the Bangladeshi lakh pattern (12,34,567) in both languages; dates use the UI language so month
 * names match it.
 */
function tag(base: "bn-BD" | "en-BD", digits: Digits): string {
  return `${base}-u-nu-${digits === "bn" ? "beng" : "latn"}`;
}

/** Formats a number with `Intl.NumberFormat` (never a hand-made digit map). */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale: Locale = getLocale(),
  digits: Digits = defaultDigits(locale),
): string {
  return new Intl.NumberFormat(tag("bn-BD", digits), options).format(value);
}

/** Formats a date in the Asia/Dhaka time zone with `Intl.DateTimeFormat`. */
export function formatDate(
  value: Date | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale: Locale = getLocale(),
  digits: Digits = defaultDigits(locale),
): string {
  return new Intl.DateTimeFormat(tag(locale === "bn" ? "bn-BD" : "en-BD", digits), {
    timeZone: DHAKA_TIME_ZONE,
    ...options,
  }).format(value);
}
