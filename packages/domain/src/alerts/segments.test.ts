import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { DEFAULT_SEGMENT_LIMITS, countSegments, parseSegmentLimits } from "./segments.js";

type Case = {
  name: string;
  text: string;
  encoding: "gsm7" | "ucs2";
  characters: number;
  units: number;
  segments: number;
  charsLeft: number;
  limits?: { gsm7Single: number; gsm7Multi: number; ucs2Single: number; ucs2Multi: number };
};
const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../fixtures/alerts/segments.json", import.meta.url)),
    "utf8",
  ),
) as { cases: Case[] };

describe("countSegments: fixtures (sample Bangla and English texts)", () => {
  for (const c of fixture.cases) {
    it(c.name, () => {
      const limits = c.limits === undefined ? DEFAULT_SEGMENT_LIMITS : parseSegmentLimits(c.limits);
      const resolved = "ok" in limits ? (limits.ok ? limits.limits : null) : limits;
      if (resolved === null) throw new Error("invalid fixture limits");
      expect(countSegments(c.text, resolved)).toEqual({
        encoding: c.encoding,
        characters: c.characters,
        units: c.units,
        segments: c.segments,
        charsLeft: c.charsLeft,
      });
    });
  }
});

describe("parseSegmentLimits", () => {
  const base = { gsm7Single: 160, gsm7Multi: 153, ucs2Single: 70, ucs2Multi: 67 };
  it("accepts sensible limits", () => {
    const r = parseSegmentLimits(base);
    expect(r).toMatchObject({ ok: true, limits: { ...base, __valid: true } });
  });
  it("rejects invalid numbers and multi limits above single limits", () => {
    for (const key of Object.keys(base) as (keyof typeof base)[]) {
      for (const bad of [1, 0, -5, 70.5, Number.NaN]) {
        expect(parseSegmentLimits({ ...base, [key]: bad })).toEqual({
          ok: false,
          reason: "invalid_limit",
        });
      }
    }
    expect(parseSegmentLimits({ ...base, gsm7Multi: 161 })).toEqual({
      ok: false,
      reason: "multi_exceeds_single",
    });
    expect(parseSegmentLimits({ ...base, ucs2Multi: 71 })).toEqual({
      ok: false,
      reason: "multi_exceeds_single",
    });
  });
});

describe("countSegments: properties", () => {
  it("English letters: segments follow the 160 / 153 rule exactly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2000 }), (n) => {
        const r = countSegments("a".repeat(n));
        const expected = n <= 160 ? 1 : Math.ceil(n / 153);
        expect(r).toMatchObject({ encoding: "gsm7", units: n, segments: expected });
        expect(r.charsLeft).toBe(n <= 160 ? 160 - n : expected * 153 - n);
      }),
    );
  });

  it("Bangla letters: segments follow the 70 / 67 rule exactly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (n) => {
        const r = countSegments("ক".repeat(n));
        const expected = n <= 70 ? 1 : Math.ceil(n / 67);
        expect(r).toMatchObject({ encoding: "ucs2", segments: expected });
        expect(r.charsLeft).toBe(n <= 70 ? 70 - n : expected * 67 - n);
      }),
    );
  });

  it("any text: never fewer segments than units allow, charsLeft within a segment, one Bangla character forces UCS-2", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 400 }), (text) => {
        const r = countSegments(text);
        const single = r.encoding === "gsm7" ? 160 : 70;
        const multi = r.encoding === "gsm7" ? 153 : 67;
        expect(r.units).toBeGreaterThanOrEqual(r.characters);
        expect(r.charsLeft).toBeGreaterThanOrEqual(0);
        expect(r.charsLeft).toBeLessThanOrEqual(single);
        if (r.units > single) expect(r.segments).toBeGreaterThanOrEqual(Math.ceil(r.units / multi));
        if (r.units > 0 && r.units <= single) expect(r.segments).toBe(1);
      }),
    );
    fc.assert(
      fc.property(
        fc.string({ unit: "grapheme-ascii", maxLength: 100 }),
        fc.nat(50),
        (ascii, at) => {
          const withBangla = ascii.slice(0, at) + "ক" + ascii.slice(at);
          expect(countSegments(withBangla).encoding).toBe("ucs2");
        },
      ),
    );
  });

  it("more text never needs fewer segments", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), fc.string({ maxLength: 50 }), (a, b) => {
        expect(countSegments(a + b).segments).toBeGreaterThanOrEqual(countSegments(a).segments);
      }),
    );
  });
});
