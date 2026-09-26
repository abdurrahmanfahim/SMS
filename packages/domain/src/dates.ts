/**
 * A calendar date in canonical `YYYY-MM-DD` form (four-digit year, zero-padded month and day, no
 * time or zone component). Build values with {@link isoDate}.
 *
 * Because every field is fixed-width and zero-padded, two `IsoDate` values sort the same way
 * lexicographically (plain string `<`/`<=`) as they do chronologically — the helpers below rely on
 * that instead of building `Date` objects to compare dates.
 */
export type IsoDate = string & { readonly __brand: "IsoDate" };

/** Outcome of {@link isoDate}. */
export type IsoDateResult =
  | { readonly ok: true; readonly value: IsoDate }
  | { readonly ok: false; readonly reason: "invalid_format" | "invalid_calendar_date" };

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Validates a calendar date string as strict `YYYY-MM-DD`, rejecting both malformed text (wrong
 * shape, non-ASCII digits) and dates that do not exist on the calendar (`2026-02-30`, `2026-02-29`
 * in a non-leap year).
 *
 * @example isoDate("2026-09-25") // { ok: true, value: "2026-09-25" }
 * @example isoDate("2026-02-30") // { ok: false, reason: "invalid_calendar_date" }
 */
export function isoDate(value: string): IsoDateResult {
  const match = ISO_DATE_PATTERN.exec(value);
  if (match === null) return { ok: false, reason: "invalid_format" };
  const { year, month, day } = numericParts(match);
  // Bound month/day to their widest possible range first. Once month is 1-12 and day is 1-31, the
  // only way `Date.UTC` can disagree with what was typed is by rolling a too-large day into the
  // next month (Feb 30, Apr 31, ...) — it can never also change the month or year we asked for,
  // so comparing the day back is sufficient (and avoids ever checking a year/month mismatch that
  // this bounding makes unreachable).
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, reason: "invalid_calendar_date" };
  }
  const real = new Date(Date.UTC(year, month - 1, day));
  if (real.getUTCDate() !== day) return { ok: false, reason: "invalid_calendar_date" };
  return { ok: true, value: value as IsoDate };
}

function numericParts(match: RegExpExecArray): { year: number; month: number; day: number } {
  return {
    year: Number(match[1] as string),
    month: Number(match[2] as string),
    day: Number(match[3] as string),
  };
}

/** Every field of an already-valid {@link IsoDate} always matches the pattern. */
function partsOf(date: IsoDate): { year: number; month: number; day: number } {
  return numericParts(ISO_DATE_PATTERN.exec(date) as RegExpExecArray);
}

function epochDayOf(date: IsoDate): number {
  const { year, month, day } = partsOf(date);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * ISO weekday numbering: 1 = Monday, ..., 7 = Sunday. Matches the numbering used by
 * `institution_settings.weekly_holidays` (default `{5}`, i.e. Friday).
 */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function isoWeekdayOfEpochDay(epochDay: number): IsoWeekday {
  const jsWeekday = new Date(epochDay * 86_400_000).getUTCDay(); // 0 = Sunday, ..., 6 = Saturday
  return (((jsWeekday + 6) % 7) + 1) as IsoWeekday;
}

/**
 * Whether `date` is a working day, i.e. its weekday is not in `weeklyHolidays`.
 *
 * This only accounts for the institution's fixed weekly holiday(s); one-off closures (public
 * holidays, exam days) are out of scope for this module.
 *
 * @example isWorkingDay(fridayDate, [5]) // false — Friday is the default weekly holiday
 */
export function isWorkingDay(date: IsoDate, weeklyHolidays: readonly IsoWeekday[]): boolean {
  return !weeklyHolidays.includes(isoWeekdayOfEpochDay(epochDayOf(date)));
}

/**
 * Counts the working days from `start` to `end`, inclusive of both ends. Returns 0 if `start` is
 * after `end`.
 *
 * @example workingDaysBetween(mondayDate, fridayDate, [5]) // 4 (Mon–Thu; Friday excluded)
 */
export function workingDaysBetween(
  start: IsoDate,
  end: IsoDate,
  weeklyHolidays: readonly IsoWeekday[],
): number {
  const startDay = epochDayOf(start);
  const endDay = epochDayOf(end);
  let count = 0;
  for (let day = startDay; day <= endDay; day += 1) {
    if (!weeklyHolidays.includes(isoWeekdayOfEpochDay(day))) count += 1;
  }
  return count;
}

/** The minimal shape {@link academicYearContaining} needs; an academic year record has more fields. */
export interface AcademicYearRange {
  /** First day of the academic year, inclusive. */
  readonly startsOn: IsoDate;
  /** Last day of the academic year, inclusive. */
  readonly endsOn: IsoDate;
}

/**
 * Finds the academic year in `years` whose range contains `date` (both ends inclusive), or `null`
 * if none does.
 *
 * Generic over `T` so the caller can pass their full academic-year records (with `id`, `nameBn`,
 * ...) and get the matching record back, not just a boolean. If ranges overlap — which
 * `docs/spec/domain-model.md` says the schema itself should prevent — the first match in array
 * order wins; this function does not assume the array is sorted.
 */
export function academicYearContaining<T extends AcademicYearRange>(
  date: IsoDate,
  years: readonly T[],
): T | null {
  for (const year of years) {
    if (year.startsOn <= date && date <= year.endsOn) return year;
  }
  return null;
}

const DHAKA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Converts an instant — a `timestamptz` value read into a `Date`, or `new Date()` passed in by the
 * caller — to the Asia/Dhaka calendar date it falls on.
 *
 * A plain `YYYY-MM-DD` calendar date has no timezone of its own; this is the one function in the
 * module where the timezone actually matters, because it bridges from an instant to one. It takes
 * the instant as a parameter rather than reading the clock itself, so it stays pure. `instant` must
 * be a valid `Date` (not one built from an unparseable value).
 *
 * @example toDhakaIsoDate(new Date("2026-09-25T19:00:00Z")) // "2026-09-26" (01:00 the next day in Dhaka)
 */
export function toDhakaIsoDate(instant: Date): IsoDate {
  return DHAKA_DATE_FORMATTER.format(instant) as IsoDate;
}

/**
 * Renders the Hijri (Islamic) calendar equivalent of `date`, for display only — e.g. next to a
 * notice date as "≈ 14 Rabiʻ II 1448 AH".
 *
 * This uses the calculated Umm al-Qura calendar (`Intl`'s `islamic-umalqura`), which can differ by
 * a day from the moon-sighting-based Hijri date locally announced in Bangladesh for religious
 * observances. Never use this to compute or validate an officially announced Hijri date (a fasting
 * or holiday start, for example) — only as a supplementary, approximate label.
 *
 * @example formatHijri(someDate, "bn") // "১৪ রবিউস সানি, ১৪৪৮ যুগ"
 */
export function formatHijri(date: IsoDate, locale: "bn" | "en" = "bn"): string {
  const { year, month, day } = partsOf(date);
  const instant = new Date(Date.UTC(year, month - 1, day));
  const formatter = new Intl.DateTimeFormat(`${locale}-BD-u-ca-islamic-umalqura`, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return formatter.format(instant);
}
