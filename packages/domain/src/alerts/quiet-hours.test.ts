import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_QUIET_HOURS,
  type QuietHours,
  isQuietTime,
  nextAllowedSendTime,
  parseQuietHours,
} from "./quiet-hours.js";

type Fixture = {
  windows: {
    name: string;
    start: string | null;
    end: string | null;
    cases: { nowUtc: string; quiet: boolean; atUtc: string; delayed: boolean }[];
  }[];
};
const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../fixtures/alerts/quiet-hours.json", import.meta.url)),
    "utf8",
  ),
) as Fixture;

function windowOf(start: string | null, end: string | null): QuietHours {
  if (start === null || end === null) return DEFAULT_QUIET_HOURS;
  const r = parseQuietHours(start, end);
  if (!r.ok) throw new Error("bad fixture window");
  return r.window;
}

describe("quiet hours: fixtures (Asia/Dhaka, midnight wrap, no DST)", () => {
  for (const w of fixture.windows) {
    for (const c of w.cases) {
      it(`${w.name}: ${c.nowUtc}`, () => {
        const window = windowOf(w.start, w.end);
        const now = new Date(c.nowUtc);
        expect(isQuietTime(now, window)).toBe(c.quiet);
        const r = nextAllowedSendTime(now, window);
        if (!r.ok) throw new Error("unexpected");
        expect(r.at.toISOString()).toBe(c.atUtc);
        expect(r.delayed).toBe(c.delayed);
      });
    }
  }
});

describe("parseQuietHours / defaults", () => {
  it("parses HH:MM and exposes the D-18 default", () => {
    expect(parseQuietHours("21:00", "07:00")).toEqual({
      ok: true,
      window: { startMinute: 1260, endMinute: 420, __valid: true },
    });
    expect(parseQuietHours("00:00", "23:59")).toMatchObject({
      ok: true,
      window: { startMinute: 0, endMinute: 1439 },
    });
    expect(DEFAULT_QUIET_HOURS).toMatchObject({ startMinute: 21 * 60, endMinute: 7 * 60 });
  });
  it("rejects anything that is not HH:MM", () => {
    for (const bad of ["", "9:00", "24:00", "12:60", "12-00", "ab:cd", "12:00pm"]) {
      expect(parseQuietHours(bad, "07:00")).toEqual({ ok: false, reason: "invalid_time" });
      expect(parseQuietHours("21:00", bad)).toEqual({ ok: false, reason: "invalid_time" });
    }
  });
});

describe("nextAllowedSendTime: invalid input and defaults", () => {
  it("returns invalid_date for an invalid Date and treats it as not quiet", () => {
    expect(nextAllowedSendTime(new Date(Number.NaN))).toEqual({
      ok: false,
      reason: "invalid_date",
    });
    expect(isQuietTime(new Date(Number.NaN))).toBe(false);
  });
  it("uses the default window when none is given", () => {
    const r = nextAllowedSendTime(new Date("2026-09-29T17:00:00.000Z")); // 23:00 in Dhaka
    expect(r).toMatchObject({ ok: true, delayed: true });
    expect(r.ok && r.at.toISOString()).toBe("2026-09-30T01:00:00.000Z");
  });
  it("handles instants before 1970 (negative timestamps)", () => {
    const r = nextAllowedSendTime(new Date("1969-12-31T17:00:00.000Z")); // 23:00 in Dhaka
    expect(r.ok && r.at.toISOString()).toBe("1970-01-01T01:00:00.000Z");
  });
});

describe("nextAllowedSendTime: properties", () => {
  const instant = fc.integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2035, 0, 1) });
  const windowArb = fc
    .tuple(fc.integer({ min: 0, max: 1439 }), fc.integer({ min: 0, max: 1439 }))
    .map(([startMinute, endMinute]): QuietHours => ({ startMinute, endMinute, __valid: true }));

  it("never earlier than now, less than 24 h later, and never inside the quiet window", () => {
    fc.assert(
      fc.property(instant, windowArb, (ms, window) => {
        const now = new Date(ms);
        const r = nextAllowedSendTime(now, window);
        if (!r.ok) throw new Error("unexpected");
        expect(r.at.getTime()).toBeGreaterThanOrEqual(ms);
        expect(r.at.getTime() - ms).toBeLessThan(86_400_000);
        expect(isQuietTime(r.at, window)).toBe(false);
        expect(r.delayed).toBe(r.at.getTime() !== ms);
        expect(r.delayed).toBe(isQuietTime(now, window));
      }),
    );
  });

  it("a delayed send lands exactly on the window's end minute in Dhaka time", () => {
    fc.assert(
      fc.property(instant, windowArb, (ms, window) => {
        const r = nextAllowedSendTime(new Date(ms), window);
        if (!r.ok || !r.delayed) return;
        const dhakaMinuteOfDay =
          (((Math.trunc(r.at.getTime() / 60000) + 360) % 1440) + 1440) % 1440;
        expect(dhakaMinuteOfDay).toBe(window.endMinute);
        expect(r.at.getTime() % 60000).toBe(0);
      }),
    );
  });

  it("is idempotent: asking again at the allowed time returns the same time", () => {
    fc.assert(
      fc.property(instant, windowArb, (ms, window) => {
        const first = nextAllowedSendTime(new Date(ms), window);
        if (!first.ok) throw new Error("unexpected");
        const second = nextAllowedSendTime(first.at, window);
        expect(second.ok && second.at.getTime()).toBe(first.at.getTime());
      }),
    );
  });
});
