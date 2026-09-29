import { isoDate } from "@sms/domain/src/dates";
import { normalizeBdPhone } from "@sms/domain/src/phone";
import { z } from "zod";

import { parseNumericInput } from "./digits";
import { formError } from "./messages";

/**
 * zod building blocks for form fields. Field values are strings (what inputs hold); the parsed
 * output is the clean value: an ASCII number, an E.164 phone, an ISO date. Error messages are i18n
 * keys (see `formError`), so they show in the person's language.
 */

export interface TextOptions {
  max?: number;
}

/** Required text, trimmed. */
export function requiredText({ max }: TextOptions = {}) {
  return z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, { error: formError("forms.error.required") })
        .refine((value) => max === undefined || value.length <= max, {
          error: formError("forms.error.tooLong", { max: max ?? 0 }),
        }),
    );
}

/** Optional text: empty becomes an empty string. */
export function optionalText({ max }: TextOptions = {}) {
  return z
    .string()
    .transform((value) => value.trim())
    .refine((value) => max === undefined || value.length <= max, {
      error: formError("forms.error.tooLong", { max: max ?? 0 }),
    });
}

export interface NumberOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

function readNumber(
  raw: string,
  { min, max, integer }: NumberOptions,
  required: boolean,
  addIssue: (message: string) => void,
): number | undefined {
  const parsed = parseNumericInput(raw);
  if (!parsed.ok) {
    if (parsed.reason === "empty") {
      if (required) addIssue(formError("forms.error.required"));
    } else addIssue(formError("forms.error.invalidNumber"));
    return undefined;
  }
  const { value } = parsed;
  if (integer && !Number.isInteger(value)) addIssue(formError("forms.error.integer"));
  else if (min !== undefined && value < min) addIssue(formError("forms.error.min", { min }));
  else if (max !== undefined && value > max) addIssue(formError("forms.error.max", { max }));
  return value;
}

/** Required number typed in Bangla or ASCII digits; parses to a `number`. */
export function numberField(options: NumberOptions = {}) {
  return z.string().transform((raw, ctx) => {
    const value = readNumber(raw, options, true, (message) =>
      ctx.addIssue({ code: "custom", message }),
    );
    return value ?? z.NEVER;
  });
}

/** Optional number: an empty field parses to `undefined`. */
export function optionalNumberField(options: NumberOptions = {}) {
  return z.string().transform((raw, ctx): number | undefined => {
    return readNumber(raw, options, false, (message) => ctx.addIssue({ code: "custom", message }));
  });
}

/** Required Bangladeshi mobile number; parses to E.164 (`+8801712345678`). */
export function phoneField() {
  return z.string().transform((raw, ctx) => {
    const result = normalizeBdPhone(raw);
    if (result.ok) return result.e164 as string;
    ctx.addIssue({
      code: "custom",
      message: formError(result.reason === "empty" ? "forms.error.required" : "forms.error.phone"),
    });
    return z.NEVER;
  });
}

/** Optional phone: empty parses to an empty string. */
export function optionalPhoneField() {
  return z.string().transform((raw, ctx): string => {
    if (raw.trim() === "") return "";
    const result = normalizeBdPhone(raw);
    if (result.ok) return result.e164 as string;
    ctx.addIssue({ code: "custom", message: formError("forms.error.phone") });
    return z.NEVER;
  });
}

export interface DateOptions {
  /** Earliest allowed date, ISO `YYYY-MM-DD`. */
  min?: string;
  /** Latest allowed date, ISO `YYYY-MM-DD`. */
  max?: string;
}

/** Required calendar date from a date input (`YYYY-MM-DD`); parses to the same ISO string. */
export function dateField({ min, max }: DateOptions = {}) {
  return z.string().transform((raw, ctx) => {
    if (raw === "") {
      ctx.addIssue({ code: "custom", message: formError("forms.error.required") });
      return z.NEVER;
    }
    const result = isoDate(raw);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: formError("forms.error.date") });
      return z.NEVER;
    }
    // ISO dates compare correctly as plain strings (see the domain `IsoDate` note).
    if (min !== undefined && result.value < min)
      ctx.addIssue({ code: "custom", message: formError("forms.error.dateMin", { min }) });
    else if (max !== undefined && result.value > max)
      ctx.addIssue({ code: "custom", message: formError("forms.error.dateMax", { max }) });
    return result.value as string;
  });
}

/** Required choice from a select: the empty option is rejected. */
export function choiceField() {
  return z.string().min(1, { error: formError("forms.error.choose") });
}
