/**
 * A daily quiet window in Asia/Dhaka local time, as minutes after midnight. It may wrap past
 * midnight (21:00 to 07:00). `startMinute` is inside the window, `endMinute` is the first allowed
 * minute. Build one with {@link parseQuietHours}.
 */
export type QuietHours = {
  readonly startMinute: number;
  readonly endMinute: number;
  readonly __valid: true;
};

/** The default window of decision D-18: 21:00 to 07:00 Asia/Dhaka. */
export const DEFAULT_QUIET_HOURS: QuietHours = { startMinute: 1260, endMinute: 420, __valid: true };

/** Outcome of {@link parseQuietHours}. */
export type QuietHoursResult =
  | { readonly ok: true; readonly window: QuietHours }
  | { readonly ok: false; readonly reason: "invalid_time" };

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function minutesOf(text: string): number | null {
  const match = TIME.exec(text);
  return match === null ? null : Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Builds a quiet window from `"HH:MM"` strings (24-hour, for example `"21:00"` and `"07:00"`).
 * Equal start and end mean there are no quiet hours. Anything that is not `HH:MM` is
 * `invalid_time`.
 */
export function parseQuietHours(start: string, end: string): QuietHoursResult {
  const startMinute = minutesOf(start);
  const endMinute = minutesOf(end);
  if (startMinute === null || endMinute === null) return { ok: false, reason: "invalid_time" };
  return { ok: true, window: { startMinute, endMinute, __valid: true } };
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
/** Asia/Dhaka is UTC+06:00 all year (no daylight saving time), so a fixed offset is exact. */
const DHAKA_OFFSET_MS = 6 * 3_600_000;

/** Outcome of {@link nextAllowedSendTime}. */
export type SendTimeResult =
  | {
      readonly ok: true;
      /** When the message may go out: `now` itself, or the end of the quiet window. */
      readonly at: Date;
      /** True when the send had to wait for the quiet window to end. */
      readonly delayed: boolean;
    }
  | { readonly ok: false; readonly reason: "invalid_date" };

/** Milliseconds since Asia/Dhaka midnight for an instant (always 0 to 86,399,999). */
function msIntoDhakaDay(instant: number): number {
  return (((instant + DHAKA_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
}

/**
 * Whether `now` falls inside the quiet window, Asia/Dhaka time. The start minute is quiet and the
 * end minute is allowed (at 07:00:00.000 sending is allowed again). Returns `false` for an invalid
 * date.
 */
export function isQuietTime(now: Date, window: QuietHours = DEFAULT_QUIET_HOURS): boolean {
  const ms = msIntoDhakaDay(now.getTime());
  const start = window.startMinute * MINUTE_MS;
  const end = window.endMinute * MINUTE_MS;
  if (start === end) return false;
  return start < end ? ms >= start && ms < end : ms >= start || ms < end;
}

/**
 * The earliest moment a text may be sent (spec §5, D-18): `now` if it is outside the quiet window,
 * otherwise the end of the window, whether that is later today or tomorrow in Asia/Dhaka (this
 * covers a window that wraps midnight). The result is always at or after `now` and less than 24
 * hours later. An invalid `Date` gives `invalid_date`.
 */
export function nextAllowedSendTime(
  now: Date,
  window: QuietHours = DEFAULT_QUIET_HOURS,
): SendTimeResult {
  const instant = now.getTime();
  if (Number.isNaN(instant)) return { ok: false, reason: "invalid_date" };
  if (!isQuietTime(now, window)) return { ok: true, at: new Date(instant), delayed: false };
  const ms = msIntoDhakaDay(instant);
  const end = window.endMinute * MINUTE_MS;
  const wait = end > ms ? end - ms : DAY_MS - ms + end;
  return { ok: true, at: new Date(instant + wait), delayed: true };
}
