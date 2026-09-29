import type { z } from "zod";

import { type EngineResult, type ResultsError, failWith, succeed } from "./errors.js";
import {
  type NonEmpty,
  type RoundingMode,
  decimalToHundredths,
  formatHundredths,
  unitForDecimals,
} from "./fixed.js";
import { type ParsedGradeSchemeConfig, gradeSchemeSchema, type passRuleSchema } from "./schema.js";

/** One group of a pass rule; `minBp` is a percentage in hundredths of a percent. */
export type PassGroup = { readonly codes: readonly string[]; readonly minBp: number };

/** A normalized pass rule; `minTotalBp` is a percentage in hundredths of a percent. */
export type PassRule = { readonly minTotalBp: number; readonly groups: readonly PassGroup[] };

/** A grade band on subject percent: `min` in hundredths of a percent, `point` in hundredths. */
export type PercentBand = {
  readonly min: number;
  readonly grade: string;
  readonly point: number | null;
};

/** A grade band on GPA: `min` in hundredths of a point. */
export type GpaGradeBand = { readonly min: number; readonly grade: string };

type SchemeCommon = {
  readonly pass: PassRule;
  readonly missing: "block" | "treat_as_absent";
  /** Size of one stored mark step in hundredths (1, 10 or 100). */
  readonly marksUnit: bigint;
  /** Size of one stored GPA step in hundredths (1, 10 or 100). */
  readonly gpaUnit: bigint;
  readonly mode: RoundingMode;
};

/** A validated, normalized GPA grade scheme (all numbers are whole hundredths). Bands ascend by `min`. */
export type GpaScheme = SchemeCommon & {
  readonly kind: "gpa_bands";
  readonly bands: NonEmpty<PercentBand>;
  readonly fail: { readonly grade: string; readonly point: number };
  readonly maxPoint: number;
  readonly optionalEnabled: boolean;
  readonly optionalThreshold: number;
  readonly failIfAnyCompulsoryFails: boolean;
  readonly failGpa: number;
  readonly gradeBands: NonEmpty<GpaGradeBand>;
};

/** A validated, normalized percentage/division grade scheme. Bands ascend by `min`. */
export type PercentageScheme = SchemeCommon & {
  readonly kind: "percentage_bands";
  readonly bands: NonEmpty<PercentBand>;
  readonly fail: { readonly grade: string };
};

/** A validated, normalized grade scheme ready for the engine. */
export type GradeScheme = GpaScheme | PercentageScheme;

/** Converts a number already validated as a hundredths decimal. */
function hundredths(value: number): number {
  return decimalToHundredths(value) as number;
}

/** Sorts bands by ascending `min`; the caller has already checked that there is at least one. */
function ascending<T extends { readonly min: number }>(items: readonly T[]): NonEmpty<T> {
  return [...items].sort((a, b) => a.min - b.min) as unknown as NonEmpty<T>;
}

/**
 * Picks the highest band whose `min` is satisfied. The lowest band (validated to start at 0) is
 * the default, so a band is always found.
 */
export function pickBand<T extends { readonly min: number }>(
  bands: NonEmpty<T>,
  reaches: (min: number) => boolean,
): T {
  let chosen: T = bands[0];
  for (const band of bands) if (reaches(band.min)) chosen = band;
  return chosen;
}

/** Normalizes a pass rule (percentages become hundredths of a percent). */
export function normalizePassRule(rule: z.output<typeof passRuleSchema>): PassRule {
  return {
    minTotalBp: hundredths(rule.min_percent_total),
    groups: rule.groups.map((group) => ({
      codes: group.codes,
      minBp: hundredths(group.min_percent),
    })),
  };
}

/**
 * Checks that band starts leave no overlap, no gap and nothing out of range. Bands are described by
 * their `min` only, so: two bands starting at the same value overlap, the lowest band must start at
 * 0 (otherwise the values below it have no band), and no band may start above `upper`.
 */
function checkBands(
  mins: readonly number[],
  upper: number,
  path: string,
  what: string,
  errors: ResultsError[],
): void {
  const sorted = [...mins].sort((a, b) => a - b);
  sorted.forEach((min, index) => {
    if (index > 0 && min === sorted[index - 1]) {
      errors.push({
        code: "bands_overlap",
        path,
        message: `Two ${what} bands start at ${formatHundredths(min)}, so they overlap.`,
      });
    }
  });
  const [lowest] = sorted;
  if (lowest !== 0) {
    errors.push({
      code: "bands_gap",
      path,
      message: `No ${what} band covers 0 up to ${formatHundredths(lowest as number)}; the lowest band must start at 0.`,
    });
  }
  const highest = Math.max(...sorted);
  if (highest > upper) {
    errors.push({
      code: "band_out_of_range",
      path,
      message: `A ${what} band starts at ${formatHundredths(highest)}, above the maximum of ${formatHundredths(upper)}.`,
    });
  }
}

/** Turns zod issues into {@link ResultsError}s located under `prefix`. */
export function zodErrors(error: z.ZodError, prefix: string): ResultsError[] {
  return error.issues.map((issue) => ({
    code: "invalid_config",
    path: [prefix, ...issue.path.map(String)].filter((part) => part !== "").join("."),
    message: issue.message,
  }));
}

/**
 * Normalizes an already zod-validated scheme and runs the band checks. `path` is where the scheme
 * lives inside the caller's input and prefixes every error path.
 */
export function schemeFromParsed(
  config: ParsedGradeSchemeConfig,
  path: string,
): EngineResult<GradeScheme> {
  const errors: ResultsError[] = [];
  const common: SchemeCommon = {
    pass: normalizePassRule(config.pass),
    missing: config.missing,
    marksUnit: unitForDecimals(config.rounding.marks_decimals),
    gpaUnit: unitForDecimals(config.rounding.gpa_decimals),
    mode: config.rounding.mode,
  };
  const at = (name: string): string => [path, name].filter((part) => part !== "").join(".");
  checkBands(
    config.bands.map((band) => hundredths(band.min)),
    10000,
    at("bands"),
    "grade",
    errors,
  );

  if (config.kind === "percentage_bands") {
    if (errors.length > 0) return failWith(errors);
    return succeed({
      ...common,
      kind: "percentage_bands",
      bands: ascending(
        config.bands.map((band) => ({ min: hundredths(band.min), grade: band.grade, point: null })),
      ),
      fail: { grade: config.fail.grade },
    });
  }

  const maxPoint = hundredths(config.gpa.max_point);
  checkBands(
    config.gpa.grade_bands.map((band) => hundredths(band.min)),
    maxPoint,
    at("gpa.grade_bands"),
    "GPA grade",
    errors,
  );
  if (errors.length > 0) return failWith(errors);
  return succeed({
    ...common,
    kind: "gpa_bands",
    bands: ascending(
      config.bands.map((band) => ({
        min: hundredths(band.min),
        grade: band.grade,
        point: hundredths(band.point),
      })),
    ),
    fail: { grade: config.fail.grade, point: hundredths(config.fail.point) },
    maxPoint,
    optionalEnabled: config.gpa.optional.enabled,
    optionalThreshold: hundredths(config.gpa.optional.threshold),
    failIfAnyCompulsoryFails: config.gpa.fail_if_any_compulsory_fails,
    failGpa: hundredths(config.gpa.fail_gpa_value),
    gradeBands: ascending(
      config.gpa.grade_bands.map((band) => ({ min: hundredths(band.min), grade: band.grade })),
    ),
  });
}

/**
 * Validates a grade-scheme configuration (spec §7) and normalizes it for the engine.
 *
 * Structural problems (missing or unknown fields, wrong types, more than 2 decimals) come back as
 * `invalid_config` errors. Band problems come back as `bands_overlap` (two bands start at the same
 * value), `bands_gap` (the lowest band does not start at 0) or `band_out_of_range` (a band starts
 * above 100 percent, or above the maximum GPA point). Never throws.
 */
export function parseGradeScheme(input: unknown): EngineResult<GradeScheme> {
  const parsed = gradeSchemeSchema.safeParse(input);
  if (!parsed.success) return failWith(zodErrors(parsed.error, ""));
  return schemeFromParsed(parsed.data, "");
}
