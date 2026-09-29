import type { IsoDate } from "../dates.js";
import type { Poisha } from "../money.js";

/** How a waiver's `value` is read: basis points (0 to 10000) for `percent`, poisha for `fixed`. */
export type WaiverKind = "percent" | "fixed";

/**
 * A fee waiver (`waivers` table). `feeHeadId: null` applies to every fee head. `endsOn: null`
 * means open-ended. Both dates are inclusive.
 */
export type Waiver = {
  readonly kind: WaiverKind;
  /** Basis points (1% = 100) for `percent`, poisha for `fixed`. */
  readonly value: number;
  readonly feeHeadId: string | null;
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate | null;
};

/** Outcome of a single waiver: the amount waived and what is left to pay. */
export type WaiverResult =
  | { readonly ok: true; readonly waiver: Poisha; readonly net: Poisha }
  | {
      readonly ok: false;
      readonly reason: "invalid_amount" | "invalid_basis_points" | "invalid_fixed_value";
    };

const isNonNegativeInteger = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

/**
 * Waives a percentage of `amount`, given in basis points (5000 = 50%), rounding half up to a whole
 * poisha: 0.5 poisha becomes 1, 0.4999 becomes 0. The waiver never exceeds `amount`. Exact
 * integer arithmetic only.
 *
 * Fails with `invalid_amount` unless `amount` is a non-negative safe integer and with
 * `invalid_basis_points` unless `basisPoints` is an integer from 0 to 10000.
 *
 * @example percentWaiver(1 as Poisha, 5000) // waiver 1 poisha (0.5 rounds up), net 0
 */
export function percentWaiver(amount: Poisha, basisPoints: number): WaiverResult {
  if (!isNonNegativeInteger(amount)) return { ok: false, reason: "invalid_amount" };
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) {
    return { ok: false, reason: "invalid_basis_points" };
  }
  // round_half_up(a x bp / 10000) = floor((2 x a x bp + 10000) / 20000), all in bigint.
  const waiver = Number((2n * BigInt(amount) * BigInt(basisPoints) + 10000n) / 20000n);
  return { ok: true, waiver: waiver as Poisha, net: (amount - waiver) as Poisha };
}

/**
 * Waives a fixed number of poisha, capped at `amount` (a waiver can make a fee free, never
 * negative). Fails with `invalid_amount` or `invalid_fixed_value` for negative or non-integer
 * numbers.
 */
export function fixedWaiver(amount: Poisha, fixed: number): WaiverResult {
  if (!isNonNegativeInteger(amount)) return { ok: false, reason: "invalid_amount" };
  if (!isNonNegativeInteger(fixed)) return { ok: false, reason: "invalid_fixed_value" };
  const waiver = Math.min(fixed, amount);
  return { ok: true, waiver: waiver as Poisha, net: (amount - waiver) as Poisha };
}

/**
 * Whether `waiver` covers fee head `feeHeadId` on the date `on` (both ends of its date range are
 * inclusive; a `null` fee head on the waiver matches every head).
 */
export function waiverApplies(waiver: Waiver, feeHeadId: string, on: IsoDate): boolean {
  if (waiver.feeHeadId !== null && waiver.feeHeadId !== feeHeadId) return false;
  if (on < waiver.startsOn) return false;
  return waiver.endsOn === null || on <= waiver.endsOn;
}

/** Outcome of {@link applyWaivers}. */
export type ApplyWaiversResult =
  | {
      readonly ok: true;
      /** Total waived across all applicable waivers. */
      readonly waiver: Poisha;
      readonly net: Poisha;
      /** Amount taken off by each applicable waiver, by its index in the input list. */
      readonly applied: readonly { readonly index: number; readonly amount: Poisha }[];
    }
  | {
      readonly ok: false;
      readonly reason: "invalid_amount" | "invalid_basis_points" | "invalid_fixed_value";
      /** Index of the offending waiver, when the problem is in a waiver. */
      readonly index?: number;
    };

/**
 * Applies every waiver that covers `feeHeadId` on `on`, in list order. Each waiver is worked out
 * on the amount still payable after the earlier ones, so the total waived never exceeds `amount`
 * (assumption: the spec does not say how several waivers combine).
 */
export function applyWaivers(
  amount: Poisha,
  waivers: readonly Waiver[],
  feeHeadId: string,
  on: IsoDate,
): ApplyWaiversResult {
  if (!isNonNegativeInteger(amount)) return { ok: false, reason: "invalid_amount" };
  let net = amount;
  const applied: { index: number; amount: Poisha }[] = [];
  for (const [index, waiver] of waivers.entries()) {
    if (!waiverApplies(waiver, feeHeadId, on)) continue;
    const result =
      waiver.kind === "percent" ? percentWaiver(net, waiver.value) : fixedWaiver(net, waiver.value);
    if (!result.ok) return { ok: false, reason: result.reason, index };
    net = result.net;
    applied.push({ index, amount: result.waiver });
  }
  return { ok: true, waiver: (amount - net) as Poisha, net, applied };
}
