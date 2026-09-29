import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { IsoDate } from "../dates.js";
import type { Poisha } from "../money.js";

import { type Waiver, applyWaivers, fixedWaiver, percentWaiver, waiverApplies } from "./waivers.js";

const p = (n: number): Poisha => n as Poisha;
const d = (s: string): IsoDate => s as IsoDate;
const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../fixtures/fees/waiver-rounding.json", import.meta.url)),
    "utf8",
  ),
) as { cases: { amount: number; basisPoints: number; waiver: number }[] };

describe("percentWaiver", () => {
  for (const c of fixture.cases) {
    it(`${c.amount} poisha at ${c.basisPoints} bp waives ${c.waiver}`, () => {
      const r = percentWaiver(p(c.amount), c.basisPoints);
      expect(r).toEqual({ ok: true, waiver: c.waiver, net: c.amount - c.waiver });
    });
  }

  it("rounds exactly .5 of a poisha up and just below down (1 poisha boundaries)", () => {
    expect(percentWaiver(p(1), 5000)).toMatchObject({ waiver: 1, net: 0 });
    expect(percentWaiver(p(1), 4999)).toMatchObject({ waiver: 0, net: 1 });
    expect(percentWaiver(p(5000), 1)).toMatchObject({ waiver: 1 });
    expect(percentWaiver(p(4999), 1)).toMatchObject({ waiver: 0 });
  });

  it("rejects bad amounts and basis points", () => {
    expect(percentWaiver(p(-1), 100)).toEqual({ ok: false, reason: "invalid_amount" });
    expect(percentWaiver(p(1.5), 100)).toEqual({ ok: false, reason: "invalid_amount" });
    for (const bp of [-1, 10001, 12.5, Number.NaN]) {
      expect(percentWaiver(p(100), bp)).toEqual({ ok: false, reason: "invalid_basis_points" });
    }
  });

  it("property: waiver is within 0..amount, net adds up, and is the nearest whole poisha (half up)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.integer({ min: 0, max: 10000 }),
        (amount, bp) => {
          const r = percentWaiver(p(amount), bp);
          if (!r.ok) throw new Error("unexpected");
          expect(r.waiver).toBeGreaterThanOrEqual(0);
          expect(r.waiver).toBeLessThanOrEqual(amount);
          expect(r.waiver + r.net).toBe(amount);
          const exact = BigInt(amount) * BigInt(bp); // half up: waiver x 10000 is in (exact - 5000, exact + 5000]
          const diff = BigInt(r.waiver) * 10000n - exact;
          expect(diff > -5000n && diff <= 5000n).toBe(true);
        },
      ),
    );
  });

  it("property: a higher percentage never waives less", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 10000 }),
        (amount, a, b) => {
          const low = percentWaiver(p(amount), Math.min(a, b));
          const high = percentWaiver(p(amount), Math.max(a, b));
          if (!low.ok || !high.ok) throw new Error("unexpected");
          expect(high.waiver).toBeGreaterThanOrEqual(low.waiver);
        },
      ),
    );
  });
});

describe("fixedWaiver", () => {
  it("is capped at the amount", () => {
    expect(fixedWaiver(p(300), 500)).toEqual({ ok: true, waiver: 300, net: 0 });
    expect(fixedWaiver(p(300), 100)).toEqual({ ok: true, waiver: 100, net: 200 });
    expect(fixedWaiver(p(300), 0)).toEqual({ ok: true, waiver: 0, net: 300 });
  });
  it("rejects bad numbers", () => {
    expect(fixedWaiver(p(-1), 1)).toEqual({ ok: false, reason: "invalid_amount" });
    expect(fixedWaiver(p(100), -1)).toEqual({ ok: false, reason: "invalid_fixed_value" });
    expect(fixedWaiver(p(100), 0.5)).toEqual({ ok: false, reason: "invalid_fixed_value" });
  });
});

const waiver = (over: Partial<Waiver> = {}): Waiver => ({
  kind: "percent",
  value: 1000,
  feeHeadId: null,
  startsOn: d("2026-01-01"),
  endsOn: null,
  ...over,
});

describe("waiverApplies", () => {
  it("matches fee head and inclusive dates", () => {
    expect(waiverApplies(waiver(), "tuition", d("2026-06-01"))).toBe(true);
    expect(waiverApplies(waiver({ feeHeadId: "tuition" }), "tuition", d("2026-06-01"))).toBe(true);
    expect(waiverApplies(waiver({ feeHeadId: "exam" }), "tuition", d("2026-06-01"))).toBe(false);
    expect(waiverApplies(waiver(), "tuition", d("2025-12-31"))).toBe(false);
    expect(waiverApplies(waiver(), "tuition", d("2026-01-01"))).toBe(true);
    const ended = waiver({ endsOn: d("2026-03-31") });
    expect(waiverApplies(ended, "tuition", d("2026-03-31"))).toBe(true);
    expect(waiverApplies(ended, "tuition", d("2026-04-01"))).toBe(false);
  });
});

describe("applyWaivers", () => {
  it("applies applicable waivers in order, each on what is left", () => {
    const r = applyWaivers(
      p(10000),
      [
        waiver({ value: 5000 }),
        waiver({ kind: "fixed", value: 1000 }),
        waiver({ feeHeadId: "other" }),
      ],
      "tuition",
      d("2026-06-01"),
    );
    expect(r).toEqual({
      ok: true,
      waiver: 6000,
      net: 4000,
      applied: [
        { index: 0, amount: 5000 },
        { index: 1, amount: 1000 },
      ],
    });
  });

  it("never waives more than the amount", () => {
    const r = applyWaivers(
      p(100),
      [waiver({ kind: "fixed", value: 80 }), waiver({ kind: "fixed", value: 80 })],
      "x",
      d("2026-06-01"),
    );
    expect(r).toMatchObject({ ok: true, waiver: 100, net: 0 });
  });

  it("returns the input amount when nothing applies", () => {
    expect(applyWaivers(p(500), [], "x", d("2026-06-01"))).toEqual({
      ok: true,
      waiver: 0,
      net: 500,
      applied: [],
    });
  });

  it("reports the offending waiver and a bad amount", () => {
    const bad = applyWaivers(p(100), [waiver(), waiver({ value: 20000 })], "x", d("2026-06-01"));
    expect(bad).toEqual({ ok: false, reason: "invalid_basis_points", index: 1 });
    const badFixed = applyWaivers(
      p(100),
      [waiver({ kind: "fixed", value: -1 })],
      "x",
      d("2026-06-01"),
    );
    expect(badFixed).toEqual({ ok: false, reason: "invalid_fixed_value", index: 0 });
    expect(applyWaivers(p(-5), [], "x", d("2026-06-01"))).toEqual({
      ok: false,
      reason: "invalid_amount",
    });
  });

  it("property: total waived plus net equals the amount and never exceeds it", () => {
    const waivers = fc.array(
      fc.oneof(
        fc.record({
          kind: fc.constant("percent" as const),
          value: fc.integer({ min: 0, max: 10000 }),
        }),
        fc.record({
          kind: fc.constant("fixed" as const),
          value: fc.integer({ min: 0, max: 100000 }),
        }),
      ),
      { maxLength: 5 },
    );
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), waivers, (amount, list) => {
        const r = applyWaivers(
          p(amount),
          list.map((w) => waiver(w)),
          "h",
          d("2026-06-01"),
        );
        if (!r.ok) throw new Error("unexpected");
        expect(r.waiver + r.net).toBe(amount);
        expect(r.net).toBeGreaterThanOrEqual(0);
        expect(r.applied.reduce((sum, a) => sum + a.amount, 0)).toBe(r.waiver);
      }),
    );
  });
});
