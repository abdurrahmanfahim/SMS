import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  academicYearContaining,
  formatHijri,
  isoDate,
  isWorkingDay,
  toDhakaIsoDate,
  workingDaysBetween,
  type IsoDate,
} from "./dates.js";

function date(value: string): IsoDate {
  const result = isoDate(value);
  if (!result.ok) throw new Error(`expected ${value} to be a valid date`);
  return result.value;
}

describe("isoDate", () => {
  it("accepts a real calendar date", () => {
    expect(isoDate("2026-09-25")).toEqual({ ok: true, value: "2026-09-25" });
  });

  it("accepts a leap-year February 29", () => {
    expect(isoDate("2024-02-29")).toEqual({ ok: true, value: "2024-02-29" });
  });

  it("rejects malformed text", () => {
    expect(isoDate("25-09-2026")).toEqual({ ok: false, reason: "invalid_format" });
    expect(isoDate("2026/09/25")).toEqual({ ok: false, reason: "invalid_format" });
    expect(isoDate("not a date")).toEqual({ ok: false, reason: "invalid_format" });
  });

  it("rejects month 00 and month 13", () => {
    expect(isoDate("2026-00-15")).toEqual({ ok: false, reason: "invalid_calendar_date" });
    expect(isoDate("2026-13-15")).toEqual({ ok: false, reason: "invalid_calendar_date" });
  });

  it("rejects day 00 and day 99", () => {
    expect(isoDate("2026-06-00")).toEqual({ ok: false, reason: "invalid_calendar_date" });
    expect(isoDate("2026-06-99")).toEqual({ ok: false, reason: "invalid_calendar_date" });
  });

  it("rejects February 30 and a non-leap-year February 29", () => {
    expect(isoDate("2026-02-30")).toEqual({ ok: false, reason: "invalid_calendar_date" });
    expect(isoDate("2026-02-29")).toEqual({ ok: false, reason: "invalid_calendar_date" });
  });

  it("rejects April 31 (a 30-day month)", () => {
    expect(isoDate("2026-04-31")).toEqual({ ok: false, reason: "invalid_calendar_date" });
  });
});

describe("isWorkingDay", () => {
  it("treats the default weekly holiday (Friday) as not a working day", () => {
    expect(isWorkingDay(date("2026-09-25"), [5])).toBe(false); // 2026-09-25 is a Friday
  });

  it("treats other weekdays as working days", () => {
    expect(isWorkingDay(date("2026-09-24"), [5])).toBe(true); // Thursday
  });

  it("supports more than one weekly holiday", () => {
    expect(isWorkingDay(date("2026-09-27"), [5, 6, 7])).toBe(false); // Sunday
  });
});

describe("workingDaysBetween", () => {
  it("counts working days across a week, excluding the weekly holiday", () => {
    // Mon 2026-09-21 .. Sun 2026-09-27, Friday off -> Mon,Tue,Wed,Thu,Sat,Sun = 6
    expect(workingDaysBetween(date("2026-09-21"), date("2026-09-27"), [5])).toBe(6);
  });

  it("counts a single working day", () => {
    expect(workingDaysBetween(date("2026-09-24"), date("2026-09-24"), [5])).toBe(1);
  });

  it("counts a single holiday as zero", () => {
    expect(workingDaysBetween(date("2026-09-25"), date("2026-09-25"), [5])).toBe(0);
  });

  it("returns 0 when start is after end", () => {
    expect(workingDaysBetween(date("2026-09-27"), date("2026-09-21"), [5])).toBe(0);
  });

  it("property: never exceeds the number of days in the range", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3000 }),
        fc.integer({ min: 0, max: 60 }),
        (startEpoch, span) => {
          const start = new Date(startEpoch * 86_400_000);
          const startIso = date(start.toISOString().slice(0, 10));
          const end = new Date((startEpoch + span) * 86_400_000);
          const endIso = date(end.toISOString().slice(0, 10));
          const result = workingDaysBetween(startIso, endIso, [5]);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(span + 1);
        },
      ),
    );
  });
});

describe("academicYearContaining", () => {
  const years = [
    { id: "y1", startsOn: date("2025-01-01"), endsOn: date("2025-12-31") },
    { id: "y2", startsOn: date("2026-01-01"), endsOn: date("2026-12-31") },
  ];

  it("finds the year containing the date", () => {
    expect(academicYearContaining(date("2026-06-15"), years)?.id).toBe("y2");
  });

  it("treats both range endpoints as inclusive", () => {
    expect(academicYearContaining(date("2026-01-01"), years)?.id).toBe("y2");
    expect(academicYearContaining(date("2026-12-31"), years)?.id).toBe("y2");
  });

  it("returns null when the date falls before every range", () => {
    expect(academicYearContaining(date("2024-06-15"), years)).toBeNull();
  });

  it("returns null when the date falls after every range", () => {
    expect(academicYearContaining(date("2027-06-15"), years)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(academicYearContaining(date("2026-06-15"), [])).toBeNull();
  });
});

describe("toDhakaIsoDate", () => {
  it("rolls over to the next Dhaka day after 18:00 UTC", () => {
    expect(toDhakaIsoDate(new Date("2026-09-25T19:00:00Z"))).toBe("2026-09-26");
  });

  it("stays on the same Dhaka day before 18:00 UTC", () => {
    expect(toDhakaIsoDate(new Date("2026-09-25T10:00:00Z"))).toBe("2026-09-25");
  });
});

describe("formatHijri", () => {
  it("renders a Bangla Hijri label by default", () => {
    expect(formatHijri(date("2026-09-25"))).toContain("১৪৪৮");
  });

  it("renders an English Hijri label when asked", () => {
    expect(formatHijri(date("2026-09-25"), "en")).toContain("1448");
  });
});
