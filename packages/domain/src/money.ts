import { asciiToBn } from "./digits.js";

/** Number of poisha in one taka. */
export const POISHA_PER_TAKA = 100;

const MAX_POISHA = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * An amount of money as a whole number of poisha (100 poisha = 1 taka).
 *
 * The brand stops a plain `number` (which might be fractional) from being passed where money is
 * expected. Build values with {@link poisha}, {@link parseTaka} or the arithmetic helpers in this
 * module. The value is a signed safe integer, so balances and differences may be negative.
 */
export type Poisha = number & { readonly __brand: "Poisha" };

/** Outcome of {@link poisha}, {@link addPoisha}, {@link subtractPoisha} and {@link sumPoisha}. */
export type PoishaResult =
  | { readonly ok: true; readonly value: Poisha }
  | { readonly ok: false; readonly reason: "not_integer" | "out_of_range" };

type Bounded =
  | { readonly ok: true; readonly value: Poisha }
  | { readonly ok: false; readonly reason: "out_of_range" };

/** Turns an exact bigint into a poisha amount, or reports that it leaves the safe integer range. */
function bounded(value: bigint): Bounded {
  if (value > MAX_POISHA || value < -MAX_POISHA) return { ok: false, reason: "out_of_range" };
  return { ok: true, value: Number(value) as Poisha };
}

/**
 * Validates a number as an amount of poisha.
 *
 * Fails with `not_integer` for fractions, `NaN` and infinities, and with `out_of_range` for
 * integers outside the safe integer range (±9 007 199 254 740 991). Negative zero becomes zero.
 */
export function poisha(value: number): PoishaResult {
  if (!Number.isInteger(value)) return { ok: false, reason: "not_integer" };
  if (!Number.isSafeInteger(value)) return { ok: false, reason: "out_of_range" };
  // `+ 0` turns -0 into 0, so equality checks never trip over a negative zero.
  return { ok: true, value: (value + 0) as Poisha };
}

/** Adds two amounts exactly. Fails with `out_of_range` if the sum leaves the safe integer range. */
export function addPoisha(a: Poisha, b: Poisha): PoishaResult {
  return bounded(BigInt(a) + BigInt(b));
}

/**
 * Subtracts `b` from `a` exactly. The result may be negative. Fails with `out_of_range` if the
 * difference leaves the safe integer range.
 */
export function subtractPoisha(a: Poisha, b: Poisha): PoishaResult {
  return bounded(BigInt(a) - BigInt(b));
}

/**
 * Adds up a list of amounts exactly (an empty list sums to zero). The sum is computed without
 * rounding, so only the final total has to fit the safe integer range; otherwise the result is
 * `out_of_range`.
 */
export function sumPoisha(values: readonly Poisha[]): PoishaResult {
  let total = 0n;
  for (const value of values) total += BigInt(value);
  return bounded(total);
}

/** Outcome of {@link allocatePoisha}. */
export type AllocateResult =
  | { readonly ok: true; readonly parts: readonly Poisha[] }
  | {
      readonly ok: false;
      readonly reason: "negative_total" | "no_weights" | "invalid_weight" | "zero_weight_total";
    };

/**
 * Splits `total` across parts in proportion to `weights` without losing or gaining a paisa: the
 * parts always add up to `total` exactly.
 *
 * Each part first gets the whole poisha of its exact share; the poisha left over are handed out
 * one each to the parts with the largest fractional remainders (largest-remainder method). Ties
 * go to the earlier part, and a part with weight 0 always gets 0.
 *
 * Weights must be non-negative safe integers and at least one must be positive; `total` must not
 * be negative. Use `[1, 1, 1]` to split evenly into three.
 *
 * @example allocatePoisha(total, [1, 1, 1]) // 100 poisha -> [34, 33, 33]
 */
export function allocatePoisha(total: Poisha, weights: readonly number[]): AllocateResult {
  if (total < 0) return { ok: false, reason: "negative_total" };
  if (weights.length === 0) return { ok: false, reason: "no_weights" };
  if (!weights.every((weight) => Number.isSafeInteger(weight) && weight >= 0)) {
    return { ok: false, reason: "invalid_weight" };
  }
  const weightList = weights.map((weight) => BigInt(weight));
  const weightTotal = weightList.reduce((sum, weight) => sum + weight, 0n);
  if (weightTotal === 0n) return { ok: false, reason: "zero_weight_total" };

  const amount = BigInt(total);
  const shares = weightList.map((weight, index) => {
    const scaled = amount * weight;
    return { index, floor: scaled / weightTotal, remainder: scaled % weightTotal };
  });
  const leftover = Number(amount - shares.reduce((sum, share) => sum + share.floor, 0n));
  const winners = new Set(
    [...shares]
      .sort((a, b) =>
        a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
      )
      .slice(0, leftover)
      .map((share) => share.index),
  );
  return {
    ok: true,
    parts: shares.map(
      (share) => (Number(share.floor) + (winners.has(share.index) ? 1 : 0)) as Poisha,
    ),
  };
}

/** Options for {@link formatPoisha}. */
export interface FormatPoishaOptions {
  /** Digit script of the result: ASCII (`"ascii"`, the default) or Bangla (`"bn"`). */
  readonly digits?: "ascii" | "bn";
  /**
   * `"auto"` (the default) prints poisha only when they are not zero (`1,250` or `1,250.50`);
   * `"always"` prints exactly two decimals (`1,250.00`).
   */
  readonly fraction?: "auto" | "always";
}

/** Groups the digits of a whole number the Bangladeshi way: 12,34,567 (last three, then pairs). */
function groupLakh(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3).replace(/\B(?=(?:\d{2})+$)/g, ",");
  return `${head},${digits.slice(-3)}`;
}

/**
 * Formats an amount of taka for display, using lakh/crore grouping (`1,25,000.50`).
 *
 * The result is only the number: the currency symbol or word (৳, টাকা, Tk) belongs to the i18n
 * layer. Negative amounts get a leading `-`. Grouping commas and the decimal point stay ASCII
 * even with Bangla digits, and the whole calculation is done on integers.
 *
 * @example formatPoisha(amount, { digits: "bn" }) // 12500050 poisha -> "১,২৫,০০০.৫০"
 */
export function formatPoisha(value: Poisha, options: FormatPoishaOptions = {}): string {
  const { digits = "ascii", fraction = "auto" } = options;
  const negative = value < 0;
  const magnitude = negative ? -value : value;
  const poishaPart = magnitude % POISHA_PER_TAKA;
  const taka = (magnitude - poishaPart) / POISHA_PER_TAKA;
  const decimals =
    fraction === "always" || poishaPart !== 0 ? `.${String(poishaPart).padStart(2, "0")}` : "";
  const text = `${negative ? "-" : ""}${groupLakh(String(taka))}${decimals}`;
  return digits === "bn" ? asciiToBn(text) : text;
}

/** Outcome of {@link parseTaka}. */
export type ParseTakaResult =
  | { readonly ok: true; readonly value: Poisha }
  | {
      readonly ok: false;
      readonly reason: "invalid_format" | "too_many_decimals" | "out_of_range";
    };

const CANONICAL_TAKA = /^(\d+)(?:\.(\d+))?$/;

/**
 * Converts a canonical taka string (`"1250"`, `"1250.5"`, `"1250.50"`) to poisha exactly, with no
 * floating point involved.
 *
 * The text must be ASCII digits with an optional `.` and decimals: no sign, no grouping commas,
 * no Bangla digits. Text typed by a person should go through `normalizeNumericInput` first (the
 * shared `takaInputSchema` does both). More than two decimals are rejected rather than rounded.
 */
export function parseTaka(text: string): ParseTakaResult {
  const match = CANONICAL_TAKA.exec(text);
  if (match === null) return { ok: false, reason: "invalid_format" };
  const whole = match[1] as string;
  const fraction = match[2] ?? "";
  if (fraction.length > 2) return { ok: false, reason: "too_many_decimals" };
  return bounded(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
}
