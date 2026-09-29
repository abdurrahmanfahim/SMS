import { z } from "zod";

import { decimalToHundredths } from "./fixed.js";

/** A non-negative configuration number with at most 2 decimals (marks, points, percentages). */
const hundredthsDecimal = z.number().refine((value) => decimalToHundredths(value) !== null, {
  message: "must be 0 or more with at most 2 decimals",
});

/** A percentage between 0 and 100 with at most 2 decimals. */
const percentValue = hundredthsDecimal.refine((value) => value <= 100, {
  message: "must be at most 100",
});

const nonEmptyString = z.string().min(1);

const decimalsSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

const groupSchema = z.strictObject({
  codes: z.array(nonEmptyString).min(1),
  min_percent: percentValue,
});

/**
 * A pass rule: the subject total must reach `min_percent_total` percent, and every group (the sum
 * of the components whose `code` is listed, across all papers) must reach its own `min_percent`.
 */
export const passRuleSchema = z.strictObject({
  min_percent_total: percentValue,
  groups: z.array(groupSchema).default([]),
});

const rankingSchema = z.strictObject({
  order: z.array(nonEmptyString).min(1),
  ties: z.enum(["competition", "dense"]),
  scopes: z.array(z.enum(["class", "section"])).min(1),
  include_failed: z.boolean(),
});

const roundingSchema = z.strictObject({
  marks_decimals: decimalsSchema,
  gpa_decimals: decimalsSchema,
  mode: z.enum(["half_up", "truncate"]),
});

const common = {
  version: z.literal(1),
  pass: passRuleSchema,
  missing: z.enum(["block", "treat_as_absent"]).default("block"),
  rounding: roundingSchema.default({ marks_decimals: 2, gpa_decimals: 2, mode: "half_up" }),
  ranking: rankingSchema.optional(),
};

const gpaScheme = z.strictObject({
  ...common,
  kind: z.literal("gpa_bands"),
  bands: z
    .array(
      z.strictObject({
        min: percentValue,
        grade: nonEmptyString,
        point: hundredthsDecimal,
        remark_bn: z.string().optional(),
      }),
    )
    .min(1),
  fail: z.strictObject({ grade: nonEmptyString, point: hundredthsDecimal }),
  gpa: z.strictObject({
    max_point: hundredthsDecimal,
    optional: z.strictObject({ enabled: z.boolean(), threshold: hundredthsDecimal }),
    fail_if_any_compulsory_fails: z.boolean(),
    fail_gpa_value: hundredthsDecimal,
    grade_bands: z.array(z.strictObject({ min: hundredthsDecimal, grade: nonEmptyString })).min(1),
  }),
});

const percentageScheme = z.strictObject({
  ...common,
  kind: z.literal("percentage_bands"),
  bands: z
    .array(
      z.strictObject({
        min: percentValue,
        grade: nonEmptyString,
        remark_bn: z.string().optional(),
      }),
    )
    .min(1),
  fail: z.strictObject({ grade: nonEmptyString }),
});

/** zod schema of `grade_schemes.config` version 1 (spec §7). */
export const gradeSchemeSchema = z.discriminatedUnion("kind", [gpaScheme, percentageScheme]);

/** A grade-scheme configuration as written in JSON (defaults for `missing` and `rounding` optional). */
export type GradeSchemeConfig = z.input<typeof gradeSchemeSchema>;

/** A validated grade-scheme configuration with defaults filled in. */
export type ParsedGradeSchemeConfig = z.output<typeof gradeSchemeSchema>;

/** A pass rule as written in JSON. */
export type PassRuleConfig = z.input<typeof passRuleSchema>;

/** A mark entry: whole hundredths of a mark, or a code for absent, exempt or withheld. */
export const markSchema = z.union([
  z.number().int().nonnegative(),
  z.enum(["absent", "exempt", "withheld"]),
]);

/** One entered mark (see {@link markSchema}). */
export type Mark = z.infer<typeof markSchema>;

const componentSchema = z.object({
  id: nonEmptyString,
  paper: z.number().int().min(1).default(1),
  code: nonEmptyString,
  full: z.number().int().positive(),
  convert_to: z.number().int().positive().optional(),
});

const subjectSchema = z.object({
  id: nonEmptyString,
  components: z.array(componentSchema).min(1),
  pass_rule: passRuleSchema.optional(),
});

const studentSchema = z.object({
  id: nonEmptyString,
  optional_subject_id: nonEmptyString.nullish(),
  subject_ids: z.array(nonEmptyString).min(1).optional(),
  marks: z.record(z.string(), z.record(z.string(), markSchema)),
});

/** zod schema of the complete input of {@link computeExam}. */
export const examSchema = z.object({
  scheme: gradeSchemeSchema,
  subjects: z.array(subjectSchema).min(1),
  students: z.array(studentSchema),
});

/** Input of `computeExam`: a scheme, the exam's subjects and each student's marks. */
export type ExamInput = z.input<typeof examSchema>;

/** Input after validation, with defaults filled in. */
export type ParsedExam = z.output<typeof examSchema>;

/** One subject of an exam as written in JSON. */
export type SubjectDefinition = ExamInput["subjects"][number];

/** One student's enrolment and marks as written in JSON. */
export type StudentInput = ExamInput["students"][number];

/** One subject after validation, with defaults filled in. */
export type ParsedSubject = ParsedExam["subjects"][number];
