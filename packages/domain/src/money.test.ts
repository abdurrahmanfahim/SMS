import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  addPoisha,
  allocatePoisha,
  formatPoisha,
  parseTaka,
  poisha,
  subtractPoisha,
  sumPoisha,
  type Poisha,
} from "./money.js";

const MAX = Number.MAX_SAFE_INTEGER;

function ok(value: number): Poisha {
  const result = poisha(value);
  if (!result.ok) throw new Error(`expected ${value} to be valid poisha`);
  return result.value;
}

describe("poisha", () => {
  it("accepts a safe integer", () => {
    expect(poisha(1250)).toEqual({ ok: true, value: 1250 });
  });

  it("rejects a non-integer", () => {
    expect(poisha(1.5)).toEqual({ ok: false, reason: "not_integer" });
  });

  it("rejects NaN and Infinity", () => {
    expect(poisha(NaN)).toEqual({ ok: false, reason: "not_integer" });
    expect(poisha(Infinity)).toEqual({ ok: false, reason: "not_integer" });
  });

  it("rejects an integer outside the safe range", () => {
    expect(poisha(MAX + 2)).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("normalizes negative zero to zero", () => {
    const result = poisha(-0);
    expect(result).toEqual({ ok: true, value: 0 });
    if (result.ok) expect(Object.is(result.value, 0)).toBe(true);
  });
});

describe("addPoisha / subtractPoisha / sumPoisha", () => {
  it("adds two amounts", () => {
    expect(addPoisha(ok(100), ok(50))).toEqual({ ok: true, value: 150 });
  });

  it("subtracts, and may go negative", () => {
    expect(subtractPoisha(ok(50), ok(100))).toEqual({ ok: true, value: -50 });
  });

  it("reports out_of_range when a sum overflows", () => {
    expect(addPoisha(ok(MAX), ok(MAX))).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("reports out_of_range when a difference underflows", () => {
    expect(subtractPoisha(ok(-MAX), ok(MAX))).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("sums an empty list to zero", () => {
    expect(sumPoisha([])).toEqual({ ok: true, value: 0 });
  });

  it("sums a list without rounding error", () => {
    expect(sumPoisha([ok(10), ok(20), ok(30)])).toEqual({ ok: true, value: 60 });
  });

  it("property: add then subtract the same amount is a no-op", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        (a, b) => {
          const added = addPoisha(ok(a), ok(b));
          if (!added.ok) throw new Error("unexpected overflow in test range");
          const back = subtractPoisha(added.value, ok(b));
          expect(back).toEqual({ ok: true, value: a });
        },
      ),
    );
  });
});

describe("allocatePoisha", () => {
  it("rejects a negative total", () => {
    expect(allocatePoisha(ok(-1), [1, 1])).toEqual({ ok: false, reason: "negative_total" });
  });

  it("rejects an empty weights list", () => {
    expect(allocatePoisha(ok(100), [])).toEqual({ ok: false, reason: "no_weights" });
  });

  it("rejects a non-safe-integer weight", () => {
    expect(allocatePoisha(ok(100), [1, 1.5])).toEqual({ ok: false, reason: "invalid_weight" });
    expect(allocatePoisha(ok(100), [1, NaN])).toEqual({ ok: false, reason: "invalid_weight" });
  });

  it("rejects a negative weight", () => {
    expect(allocatePoisha(ok(100), [1, -1])).toEqual({ ok: false, reason: "invalid_weight" });
  });

  it("rejects weights that are all zero", () => {
    expect(allocatePoisha(ok(100), [0, 0, 0])).toEqual({ ok: false, reason: "zero_weight_total" });
  });

  it("gives a zero-weight part nothing", () => {
    const result = allocatePoisha(ok(100), [1, 0]);
    expect(result).toEqual({ ok: true, parts: [100, 0] });
  });

  it("splits evenly with ties broken by earlier index (all remainders equal)", () => {
    expect(allocatePoisha(ok(100), [1, 1, 1])).toEqual({ ok: true, parts: [34, 33, 33] });
  });

  it("splits by distinct weights (remainders differ)", () => {
    // 100 * [1,2,3] / 6 -> floors [16,33,50] remainders [4,2,0]; the one leftover poisha goes
    // to the largest remainder (index 0).
    expect(allocatePoisha(ok(100), [1, 2, 3])).toEqual({ ok: true, parts: [17, 33, 50] });
  });

  it("splits by distinct weights given in the opposite order", () => {
    expect(allocatePoisha(ok(100), [3, 2, 1])).toEqual({ ok: true, parts: [50, 33, 17] });
  });

  it("handles a total of zero", () => {
    expect(allocatePoisha(ok(0), [1, 1, 1])).toEqual({ ok: true, parts: [0, 0, 0] });
  });

  it("property: parts always sum to the total exactly, for any non-negative weights", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 8 }),
        (total, weights) => {
          fc.pre(weights.some((weight) => weight > 0));
          const result = allocatePoisha(ok(total), weights);
          if (!result.ok) throw new Error(`unexpected failure: ${result.reason}`);
          const sum = result.parts.reduce((a, b) => a + b, 0);
          expect(sum).toBe(total);
          expect(result.parts).toHaveLength(weights.length);
        },
      ),
    );
  });

  it("property: a weight of 0 always gets a part of 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 1000 }),
        (total, weight) => {
          const result = allocatePoisha(ok(total), [0, weight]);
          if (!result.ok) throw new Error(`unexpected failure: ${result.reason}`);
          expect(result.parts[0]).toBe(0);
        },
      ),
    );
  });
});

describe("formatPoisha", () => {
  it("formats a whole-taka amount with no decimals by default", () => {
    expect(formatPoisha(ok(150000))).toBe("1,500");
  });

  it("always shows two decimals when fraction is 'always'", () => {
    expect(formatPoisha(ok(150000), { fraction: "always" })).toBe("1,500.00");
  });

  it("shows decimals automatically when poisha is non-zero", () => {
    expect(formatPoisha(ok(150050))).toBe("1,500.50");
  });

  it("applies lakh/crore grouping for large amounts", () => {
    expect(formatPoisha(ok(1_250_005_000))).toBe("1,25,00,050");
  });

  it("does not group a small amount", () => {
    expect(formatPoisha(ok(50000))).toBe("500");
  });

  it("renders a negative amount with a leading minus", () => {
    expect(formatPoisha(ok(-150000))).toBe("-1,500");
  });

  it("renders Bangla digits on request", () => {
    expect(formatPoisha(ok(150050), { digits: "bn" })).toBe("১,৫০০.৫০");
  });
});

describe("parseTaka", () => {
  it("parses a whole amount", () => {
    expect(parseTaka("1250")).toEqual({ ok: true, value: 125000 });
  });

  it("parses a two-decimal amount", () => {
    expect(parseTaka("1250.50")).toEqual({ ok: true, value: 125050 });
  });

  it("pads a single decimal digit", () => {
    expect(parseTaka("1250.5")).toEqual({ ok: true, value: 125050 });
  });

  it("rejects more than two decimal places", () => {
    expect(parseTaka("1250.505")).toEqual({ ok: false, reason: "too_many_decimals" });
  });

  it("rejects non-canonical text", () => {
    expect(parseTaka("৳1,250")).toEqual({ ok: false, reason: "invalid_format" });
    expect(parseTaka("")).toEqual({ ok: false, reason: "invalid_format" });
    expect(parseTaka("-100")).toEqual({ ok: false, reason: "invalid_format" });
  });

  it("rejects an amount outside the safe range", () => {
    expect(parseTaka(`${MAX}0`)).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("property: formatting a parsed whole-taka amount round-trips (ignoring grouping commas)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 90_000_000 }), (taka) => {
        const parsed = parseTaka(String(taka));
        if (!parsed.ok) throw new Error("unexpected parse failure in test range");
        const formatted = formatPoisha(parsed.value, { fraction: "always" });
        expect(formatted.replace(/,/g, "")).toBe(`${taka}.00`);
      }),
    );
  });
});
