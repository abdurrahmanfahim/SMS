import type { GradeSchemeConfig } from "./schema.js";

/**
 * Bangladesh general-education GPA-5 scheme (spec §7): 80 to 100 percent is A+ (5.00) down to
 * 33 percent D (1.00), below that F; pass mark 33 percent; optional subject adds points above 2.00
 * and the GPA is capped at 5.00; an F in any compulsory subject fails the student.
 */
export const BD_GENERAL_GPA5: GradeSchemeConfig = {
  version: 1,
  kind: "gpa_bands",
  bands: [
    { min: 80, grade: "A+", point: 5.0, remark_bn: "অসাধারণ" },
    { min: 70, grade: "A", point: 4.0 },
    { min: 60, grade: "A-", point: 3.5 },
    { min: 50, grade: "B", point: 3.0 },
    { min: 40, grade: "C", point: 2.0 },
    { min: 33, grade: "D", point: 1.0 },
    { min: 0, grade: "F", point: 0.0 },
  ],
  fail: { grade: "F", point: 0.0 },
  pass: { min_percent_total: 33, groups: [] },
  gpa: {
    max_point: 5.0,
    optional: { enabled: true, threshold: 2.0 },
    fail_if_any_compulsory_fails: true,
    fail_gpa_value: 0.0,
    grade_bands: [
      { min: 5.0, grade: "A+" },
      { min: 4.0, grade: "A" },
      { min: 3.5, grade: "A-" },
      { min: 3.0, grade: "B" },
      { min: 2.0, grade: "C" },
      { min: 1.0, grade: "D" },
      { min: 0.0, grade: "F" },
    ],
  },
  missing: "block",
  rounding: { marks_decimals: 2, gpa_decimals: 2, mode: "half_up" },
  ranking: {
    order: ["outcome", "total_desc", "gpa_desc", "roll_asc"],
    ties: "competition",
    scopes: ["class", "section"],
    include_failed: false,
  },
};

/** Grade-scheme presets shipped with the engine, by id. */
export const PRESETS: Readonly<Record<"bd-general-gpa5", GradeSchemeConfig>> = {
  "bd-general-gpa5": BD_GENERAL_GPA5,
};
