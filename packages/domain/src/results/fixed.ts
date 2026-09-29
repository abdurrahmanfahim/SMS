/**
 * Exact integer arithmetic for marks and points.
 *
 * Marks and points are whole numbers of hundredths (45.50 marks is `4550`). Percentages are kept as
 * exact fractions and compared by cross-multiplication with `bigint`; they are rounded only when a
 * stored number is produced. Nothing in `src/results` may use floating-point arithmetic (enforced
 * by the ESLint rule in `eslint.config.js` and by `no-float.test.ts`).
 */

/** How an exact fraction is turned into a whole number: `half_up` rounds .5 up, `truncate` drops it. */
export type RoundingMode = "half_up" | "truncate";

/** A tuple with at least one element. */
export type NonEmpty<T> = readonly [T, ...T[]];

const DECIMAL_TEXT = /^\d+(?:\.\d{1,2})?$/;

/**
 * Converts a configuration number such as `3.5` or `33` to whole hundredths (`350`, `3300`) by
 * reading its decimal text, so no floating-point arithmetic touches the value.
 *
 * Returns `null` for negative numbers, more than 2 decimals, exponent notation, `NaN`, infinities
 * and results beyond the safe integer range.
 */
export function decimalToHundredths(value: number): number | null {
  const text = String(value);
  if (!DECIMAL_TEXT.test(text)) return null;
  const dot = text.indexOf(".");
  const whole = dot === -1 ? text : text.slice(0, dot);
  const fraction = dot === -1 ? "" : text.slice(dot + 1);
  const hundredths = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(hundredths) ? hundredths : null;
}

/**
 * Integer division of a non-negative `numerator` by a positive `denominator`, rounded as `mode`
 * says. `half_up` rounds an exact half up; `truncate` rounds down.
 */
export function divRound(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  const quotient = numerator / denominator;
  if (mode === "truncate") return quotient;
  return 2n * (numerator - quotient * denominator) >= denominator ? quotient + 1n : quotient;
}

/**
 * Rounds `numerator / denominator` to a whole multiple of `unit` and returns that multiple (not
 * the count of units). `unit` is 1 for hundredths, 10 for tenths, 100 for whole numbers.
 */
export function roundToUnit(
  numerator: bigint,
  denominator: bigint,
  unit: bigint,
  mode: RoundingMode,
): bigint {
  return divRound(numerator, denominator * unit, mode) * unit;
}

/** Size of one displayed step in hundredths for 0, 1 or 2 decimals (100, 10 or 1). */
export function unitForDecimals(decimals: 0 | 1 | 2): bigint {
  return 10n ** BigInt(2 - decimals);
}

/** Least common multiple of positive integers; an empty list gives 1. */
export function lcm(values: readonly bigint[]): bigint {
  return values.reduce((acc, value) => {
    let a = acc;
    let b = value;
    while (b !== 0n) [a, b] = [b, a % b];
    return (acc / a) * value;
  }, 1n);
}

/**
 * Exact test of `numerator / denominator >= minBasisPoints / 10000`, that is, whether a fraction is
 * at least a percentage given in hundredths of a percent (33% is `3300`).
 */
export function atLeastPercent(
  numerator: bigint,
  denominator: bigint,
  minBasisPoints: number,
): boolean {
  return numerator * 10000n >= BigInt(minBasisPoints) * denominator;
}

/**
 * Formats a non-negative whole number of hundredths with two decimals: `367` becomes `"3.67"`.
 * Negative input is not supported.
 */
export function formatHundredths(value: number): string {
  const v = BigInt(value);
  return `${v / 100n}.${(v % 100n).toString().padStart(2, "0")}`;
}
