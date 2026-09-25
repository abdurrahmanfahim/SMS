import { z } from "zod";

import { type IsoDate, isoDate } from "./dates.js";
import { normalizeNumericInput } from "./digits.js";
import { type Uuid, uuid } from "./ids.js";
import { type Poisha, parseTaka, poisha } from "./money.js";
import { type BdMobileE164, normalizeBdPhone } from "./phone.js";

/** Validates and canonicalizes a UUID string (see {@link uuid}). */
export const uuidSchema: z.ZodType<Uuid, string> = z.string().transform((value, ctx) => {
  const result = uuid(value);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.reason });
    return z.NEVER;
  }
  return result.value;
});

/** Validates a strict `YYYY-MM-DD` calendar date string (see {@link isoDate}). */
export const isoDateSchema: z.ZodType<IsoDate, string> = z.string().transform((value, ctx) => {
  const result = isoDate(value);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.reason });
    return z.NEVER;
  }
  return result.value;
});

/**
 * Validates that a string is *already* a canonical Bangladeshi mobile number in E.164 form
 * (`+8801XXXXXXXXX`) — for data coming back from storage, which should already be canonical, not
 * for a form field a person just typed into (use {@link bdPhoneInputSchema} for that). Matches the
 * `phone_e164` check constraint in `docs/spec/domain-model.md`.
 */
export const phoneE164Schema: z.ZodType<BdMobileE164, string> = z
  .string()
  .transform((value, ctx) => {
    const result = normalizeBdPhone(value);
    if (!result.ok || result.e164 !== value) {
      ctx.addIssue({ code: "custom", message: "not_canonical_bd_mobile_e164" });
      return z.NEVER;
    }
    return result.e164;
  });

/**
 * Accepts a Bangladeshi mobile number as a person might type it (local or international form,
 * Bangla digits, spaces or dashes) and normalizes it to E.164 (see {@link normalizeBdPhone}).
 */
export const bdPhoneInputSchema: z.ZodType<BdMobileE164, string> = z
  .string()
  .transform((value, ctx) => {
    const result = normalizeBdPhone(value);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.reason });
      return z.NEVER;
    }
    return result.e164;
  });

/** Validates a number as an amount of poisha (see {@link poisha}). */
export const moneyPoishaSchema: z.ZodType<Poisha, number> = z.number().transform((value, ctx) => {
  const result = poisha(value);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.reason });
    return z.NEVER;
  }
  return result.value;
});

/**
 * Accepts a taka amount as a person might type it — Bangla or ASCII digits, thousand-separator
 * commas — and converts it to poisha (see {@link normalizeNumericInput} and {@link parseTaka}).
 */
export const takaInputSchema: z.ZodType<Poisha, string> = z.string().transform((value, ctx) => {
  const result = parseTaka(normalizeNumericInput(value));
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.reason });
    return z.NEVER;
  }
  return result.value;
});
