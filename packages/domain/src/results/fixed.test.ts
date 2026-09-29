import { describe, expect, it } from "vitest";

import {
  atLeastPercent,
  compareIds,
  decimalToHundredths,
  divRound,
  formatHundredths,
  lcm,
  roundToUnit,
  unitForDecimals,
} from "./fixed.js";

describe("decimalToHundredths", () => {
  it("reads decimal text without floating-point arithmetic", () => {
    expect(decimalToHundredths(0)).toBe(0);
    expect(decimalToHundredths(33)).toBe(3300);
    expect(decimalToHundredths(3.5)).toBe(350);
    expect(decimalToHundredths(0.07)).toBe(7);
    expect(decimalToHundredths(79.99)).toBe(7999);
    expect(decimalToHundredths(5.0)).toBe(500);
  });

  it("rejects negatives, 3+ decimals, exponent notation and non-finite numbers", () => {
    for (const bad of [-1, 1.234, 1e-7, 1e21, Number.NaN, Infinity]) {
      expect(decimalToHundredths(bad)).toBeNull();
    }
  });

  it("rejects results beyond the safe integer range", () => {
    expect(decimalToHundredths(Number.MAX_SAFE_INTEGER)).toBeNull();
  });
});

describe("divRound / roundToUnit", () => {
  it("rounds half up and truncates", () => {
    expect(divRound(22n, 6n, "half_up")).toBe(4n);
    expect(divRound(22n, 6n, "truncate")).toBe(3n);
    expect(divRound(5n, 2n, "half_up")).toBe(3n);
    expect(divRound(5n, 2n, "truncate")).toBe(2n);
    expect(divRound(7n, 3n, "half_up")).toBe(2n);
  });

  it("rounds to a unit and returns a multiple of it", () => {
    // 22/6 points = 366.67 hundredths -> 367 (hundredths), 370 (tenths), 400 (whole)
    expect(roundToUnit(2200n, 6n, 1n, "half_up")).toBe(367n);
    expect(roundToUnit(2200n, 6n, 10n, "half_up")).toBe(370n);
    expect(roundToUnit(2200n, 6n, 100n, "half_up")).toBe(400n);
    expect(roundToUnit(2200n, 6n, 1n, "truncate")).toBe(366n);
  });

  it("maps decimals to units", () => {
    expect(unitForDecimals(0)).toBe(100n);
    expect(unitForDecimals(1)).toBe(10n);
    expect(unitForDecimals(2)).toBe(1n);
  });
});

describe("lcm / atLeastPercent / formatHundredths", () => {
  it("computes the least common multiple", () => {
    expect(lcm([])).toBe(1n);
    expect(lcm([4n, 6n])).toBe(12n);
    expect(lcm([3n, 5n, 7n])).toBe(105n);
  });

  it("compares a fraction with a percentage exactly", () => {
    expect(atLeastPercent(33n, 100n, 3300)).toBe(true);
    expect(atLeastPercent(3299n, 10000n, 3300)).toBe(false);
    expect(atLeastPercent(0n, 5n, 0)).toBe(true);
  });

  it("formats hundredths with two decimals", () => {
    expect(formatHundredths(367)).toBe("3.67");
    expect(formatHundredths(0)).toBe("0.00");
    expect(formatHundredths(5)).toBe("0.05");
    expect(formatHundredths(10000)).toBe("100.00");
  });
});

describe("compareIds", () => {
  it("orders by code unit and is 0 for equal ids", () => {
    expect(compareIds("a", "b")).toBe(-1);
    expect(compareIds("b", "a")).toBe(1);
    expect(compareIds("a", "a")).toBe(0);
    expect(["b", "B", "a"].sort(compareIds)).toEqual(["B", "a", "b"]);
  });
});
