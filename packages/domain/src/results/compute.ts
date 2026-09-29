import {
  type GpaScheme,
  type GradeScheme,
  type PassRule,
  normalizePassRule,
  pickBand,
  schemeFromParsed,
  zodErrors,
} from "./config.js";
import { type EngineResult, type ResultsError, failWith, succeed } from "./errors.js";
import { atLeastPercent, compareIds, divRound, lcm, roundToUnit } from "./fixed.js";
import { type ExamInput, type Mark, type ParsedSubject, examSchema } from "./schema.js";

/** Version of the engine's rules; stored in every published snapshot (spec §8). */
export const ENGINE_VERSION = 1;

/** State of one component after the marks were read. */
export type ComponentState = "scored" | "absent" | "exempt";

/** One component's entry in a {@link SubjectResult}. Marks are whole hundredths. */
export type ComponentResult = {
  readonly id: string;
  readonly code: string;
  readonly paper: number;
  /** Full marks of the component in hundredths (before any conversion). */
  readonly full: number;
  /** Entered marks in hundredths; `null` when absent or exempt. */
  readonly mark: number | null;
  readonly state: ComponentState;
};

/** Why a subject failed. */
export type FailReason =
  | { readonly kind: "total_below_min" }
  | { readonly kind: "group_below_min"; readonly codes: readonly string[] }
  | { readonly kind: "absent_component"; readonly component_id: string };

/**
 * Result of one subject (the shape stored in `result_rows.subjects`). All marks are whole
 * hundredths; `percent_bp` is the percent of full marks in hundredths of a percent (66.5% is
 * `6650`); `point` is in hundredths and `null` for percentage schemes. `exact_total` is the
 * unrounded total as a fraction of decimal strings, so the overall result can be computed without
 * accumulating rounding error.
 */
export type SubjectResult = {
  readonly subject_id: string;
  readonly status: "counted" | "exempt" | "withheld";
  readonly components: readonly ComponentResult[];
  readonly total: number | null;
  readonly full: number | null;
  readonly percent_bp: number | null;
  readonly grade: string | null;
  readonly point: number | null;
  readonly passed: boolean | null;
  /** True when every counted component was absent. */
  readonly all_absent: boolean;
  readonly reasons: readonly FailReason[];
  readonly exact_total: { readonly num: string; readonly den: string } | null;
};

type Fraction = { readonly n: bigint; readonly d: bigint };

const ZERO: Fraction = { n: 0n, d: 1n };

function addFraction(acc: Fraction, n: bigint, d: bigint): Fraction {
  const den = lcm([acc.d, d]);
  return { n: acc.n * (den / acc.d) + n * (den / d), d: den };
}

function emptySubject(
  subjectId: string,
  status: "exempt" | "withheld",
  components: readonly ComponentResult[],
): SubjectResult {
  return {
    subject_id: subjectId,
    status,
    components,
    total: null,
    full: null,
    percent_bp: null,
    grade: null,
    point: null,
    passed: null,
    all_absent: false,
    reasons: [],
    exact_total: null,
  };
}

/** Input of {@link computeSubjectResults}. `subject` and `scheme` must already be validated. */
export type SubjectInput = {
  readonly scheme: GradeScheme;
  readonly subject: ParsedSubject;
  /** Marks by component id; a missing key means not entered. */
  readonly marks?: Readonly<Record<string, Mark>> | undefined;
};

type PreparedComponent = {
  readonly id: string;
  readonly code: string;
  readonly paper: number;
  /** Raw full marks in hundredths. */
  readonly fullH: number;
  /** Numerator factor of the conversion (`convert_to`), or 1n without conversion. */
  readonly factor: bigint;
  /** Denominator of the conversion (the component's full marks), or 1n without conversion. */
  readonly divisor: bigint;
  /** Full marks after conversion, in hundredths. */
  readonly convertedFullH: bigint;
};

/** A subject with its components ordered and its pass rule normalized; built once per exam. */
type PreparedSubjectRun = {
  readonly scheme: GradeScheme;
  readonly id: string;
  readonly components: readonly PreparedComponent[];
  readonly rule: PassRule;
};

function prepareSubject(scheme: GradeScheme, subject: ParsedSubject): PreparedSubjectRun {
  const ordered = [...subject.components].sort(
    (a, b) => a.paper - b.paper || compareIds(a.id, b.id),
  );
  return {
    scheme,
    id: subject.id,
    components: ordered.map((c) => ({
      id: c.id,
      code: c.code,
      paper: c.paper,
      fullH: c.full * 100,
      factor: BigInt(c.convert_to ?? 1),
      divisor: BigInt(c.convert_to === undefined ? 1 : c.full),
      convertedFullH: BigInt(c.convert_to ?? c.full) * 100n,
    })),
    rule: subject.pass_rule === undefined ? scheme.pass : normalizePassRule(subject.pass_rule),
  };
}

function runSubject(
  prep: PreparedSubjectRun,
  marks: Readonly<Record<string, Mark>> | undefined,
): EngineResult<SubjectResult> {
  const { scheme, components } = prep;
  const errors: ResultsError[] = [];
  const view: ComponentResult[] = [];
  let withheld = false;

  for (const component of components) {
    const entered = marks?.[component.id];
    let state: ComponentState = "scored";
    let mark: number | null = null;
    if (entered === undefined) {
      if (scheme.missing === "block") {
        errors.push({
          code: "missing_marks",
          path: `${prep.id}.${component.id}`,
          message: `No marks entered for component ${component.id} of subject ${prep.id}.`,
        });
      } else {
        state = "absent";
      }
    } else if (entered === "absent") {
      state = "absent";
    } else if (entered === "exempt") {
      state = "exempt";
    } else if (entered === "withheld") {
      withheld = true;
    } else if (entered > component.fullH) {
      errors.push({
        code: "mark_out_of_range",
        path: `${prep.id}.${component.id}`,
        message: `Marks for component ${component.id} of subject ${prep.id} are above its full marks.`,
      });
    } else {
      mark = entered;
    }
    view.push({
      id: component.id,
      code: component.code,
      paper: component.paper,
      full: component.fullH,
      mark,
      state,
    });
  }

  if (errors.length > 0) return failWith(errors);
  if (withheld) return succeed(emptySubject(prep.id, "withheld", view));

  const countedIndexes: number[] = [];
  view.forEach((entry, index) => {
    if (entry.state !== "exempt") countedIndexes.push(index);
  });
  if (countedIndexes.length === 0) return succeed(emptySubject(prep.id, "exempt", view));

  // Exact fractions: converted marks are `mark x factor / divisor`.
  let total = ZERO;
  let fullH = 0n;
  for (const index of countedIndexes) {
    const component = components[index] as PreparedComponent;
    total = addFraction(
      total,
      BigInt((view[index] as ComponentResult).mark ?? 0) * component.factor,
      component.divisor,
    );
    fullH += component.convertedFullH;
  }
  const denominator = total.d * fullH;

  const reasons: FailReason[] = [];
  for (const index of countedIndexes) {
    const entry = view[index] as ComponentResult;
    if (entry.state === "absent")
      reasons.push({ kind: "absent_component", component_id: entry.id });
  }
  if (!atLeastPercent(total.n, denominator, prep.rule.minTotalBp)) {
    reasons.push({ kind: "total_below_min" });
  }
  for (const group of prep.rule.groups) {
    let groupTotal = ZERO;
    let groupFull = 0n;
    for (const index of countedIndexes) {
      const component = components[index] as PreparedComponent;
      if (!group.codes.includes(component.code)) continue;
      groupTotal = addFraction(
        groupTotal,
        BigInt((view[index] as ComponentResult).mark ?? 0) * component.factor,
        component.divisor,
      );
      groupFull += component.convertedFullH;
    }
    if (groupFull > 0n && !atLeastPercent(groupTotal.n, groupTotal.d * groupFull, group.minBp)) {
      reasons.push({ kind: "group_below_min", codes: group.codes });
    }
  }

  const passed = reasons.length === 0;
  const band = pickBand(scheme.bands, (min) => atLeastPercent(total.n, denominator, min));
  const grade = passed ? band.grade : scheme.fail.grade;
  const point =
    scheme.kind === "gpa_bands" ? (passed ? (band.point as number) : scheme.fail.point) : null;

  return succeed({
    subject_id: prep.id,
    status: "counted",
    components: view,
    total: Number(roundToUnit(total.n, total.d, scheme.marksUnit, scheme.mode)),
    full: Number(fullH),
    percent_bp: Number(divRound(total.n * 10000n, denominator, scheme.mode)),
    grade,
    point,
    passed,
    all_absent: countedIndexes.every(
      (index) => (view[index] as ComponentResult).state === "absent",
    ),
    reasons,
    exact_total: { num: total.n.toString(), den: total.d.toString() },
  });
}

/**
 * Computes one subject's result (spec §3 steps 1 to 6): validates marks, converts components,
 * totals all papers, checks the total and group pass rules and looks up grade and point.
 *
 * `scheme` comes from `parseGradeScheme` and `subject` from the validated exam. Marks are whole
 * hundredths. Returns `mark_out_of_range` for a mark above its component's full marks and, when
 * the scheme's `missing` policy is `block`, `missing_marks` for each component without an entry
 * (with `treat_as_absent` those components count as absent). A `withheld` code gives a `withheld`
 * subject; a subject whose components are all `exempt` gives an `exempt` subject that is left out
 * of every total. A component `absent` counts as 0 and fails the subject. Never throws.
 */
export function computeSubjectResults(input: SubjectInput): EngineResult<SubjectResult> {
  return runSubject(prepareSubject(input.scheme, input.subject), input.marks);
}

/** Overall outcome of a student. */
export type Outcome = "passed" | "failed" | "absent" | "withheld";

/**
 * Overall result of a student (the shape stored in `result_rows.totals`). `total` and `full` are
 * hundredths of marks over counted subjects; `average_percent_bp` is in hundredths of a percent;
 * `gpa` is in hundredths and `null` for percentage schemes, `withheld` and `absent` outcomes.
 */
export type OverallResult = {
  readonly outcome: Outcome;
  readonly total: number | null;
  readonly full: number | null;
  readonly average_percent_bp: number | null;
  readonly gpa: number | null;
  readonly grade: string | null;
  readonly counted_subject_ids: readonly string[];
  readonly failed_subject_ids: readonly string[];
};

/** Input of {@link computeOverall}. */
export type OverallInput = {
  readonly scheme: GradeScheme;
  readonly subjects: readonly SubjectResult[];
  /** The student's chosen optional (4th) subject, if any. */
  readonly optional_subject_id?: string | null | undefined;
};

/**
 * Computes a student's overall result (spec §4 and §5) from their subject results.
 *
 * Any `withheld` subject makes the outcome `withheld`; if every counted subject is absent in every
 * component the outcome is `absent`. For a `gpa_bands` scheme the GPA is
 * `(points of compulsory counted subjects + optional bonus) / number of compulsory counted
 * subjects`, capped at `max_point` and rounded as configured; the overall grade is looked up from
 * the rounded GPA. An optional subject only adds `max(0, point - threshold)`, never fails the
 * student and is not in the denominator. If a compulsory subject fails (and the scheme says so)
 * the outcome is `failed` with the fail grade and `fail_gpa_value`. For `percentage_bands`,
 * `passed` needs every counted subject to pass and the grade comes from the average percent.
 * Returns `unknown_reference` for an optional id that is not among the subjects,
 * `no_counted_subjects` when everything is exempt and `no_compulsory_subjects` when a GPA has no
 * compulsory subject to divide by. Never throws.
 */
export function computeOverall(input: OverallInput): EngineResult<OverallResult> {
  const { scheme, subjects } = input;
  const optionalId = input.optional_subject_id ?? null;
  if (optionalId !== null && !subjects.some((s) => s.subject_id === optionalId)) {
    return failWith([
      {
        code: "unknown_reference",
        path: "optional_subject_id",
        message: `Optional subject ${optionalId} is not among the student's subjects.`,
      },
    ]);
  }
  const nothing = (outcome: Outcome): OverallResult => ({
    outcome,
    total: null,
    full: null,
    average_percent_bp: null,
    gpa: null,
    grade: null,
    counted_subject_ids: [],
    failed_subject_ids: [],
  });
  if (subjects.some((s) => s.status === "withheld")) return succeed(nothing("withheld"));

  const counted = subjects.filter((s) => s.status === "counted");
  if (counted.length === 0) {
    return failWith([
      {
        code: "no_counted_subjects",
        path: "",
        message: "Every subject is exempt; nothing to compute.",
      },
    ]);
  }

  let total = ZERO;
  let fullH = 0n;
  for (const subject of counted) {
    const exact = subject.exact_total as { num: string; den: string };
    total = addFraction(total, BigInt(exact.num), BigInt(exact.den));
    fullH += BigInt(subject.full as number);
  }
  const denominator = total.d * fullH;
  const base = {
    total: Number(roundToUnit(total.n, total.d, scheme.marksUnit, scheme.mode)),
    full: Number(fullH),
    average_percent_bp: Number(divRound(total.n * 10000n, denominator, scheme.mode)),
    counted_subject_ids: counted.map((s) => s.subject_id),
    failed_subject_ids: counted.filter((s) => s.passed === false).map((s) => s.subject_id),
  };

  if (counted.every((s) => s.all_absent)) {
    return succeed({ ...base, outcome: "absent", gpa: null, grade: null });
  }

  if (scheme.kind === "percentage_bands") {
    if (base.failed_subject_ids.length > 0) {
      return succeed({ ...base, outcome: "failed", gpa: null, grade: scheme.fail.grade });
    }
    const band = pickBand(scheme.bands, (min) => atLeastPercent(total.n, denominator, min));
    return succeed({ ...base, outcome: "passed", gpa: null, grade: band.grade });
  }
  return gpaOverall(scheme, counted, optionalId, base);
}

type OverallBase = Omit<OverallResult, "outcome" | "gpa" | "grade">;

function gpaOverall(
  scheme: GpaScheme,
  counted: readonly SubjectResult[],
  optionalId: string | null,
  base: OverallBase,
): EngineResult<OverallResult> {
  const optional =
    scheme.optionalEnabled && optionalId !== null
      ? counted.find((s) => s.subject_id === optionalId)
      : undefined;
  const compulsory = counted.filter((s) => s !== optional);
  if (compulsory.length === 0) {
    return failWith([
      {
        code: "no_compulsory_subjects",
        path: "",
        message: "A GPA needs at least one compulsory counted subject.",
      },
    ]);
  }
  const failedCompulsory = compulsory.some((s) => s.passed === false);
  if (scheme.failIfAnyCompulsoryFails && failedCompulsory) {
    return succeed({ ...base, outcome: "failed", gpa: scheme.failGpa, grade: scheme.fail.grade });
  }

  const count = BigInt(compulsory.length);
  let points = 0n;
  for (const subject of compulsory) points += BigInt(subject.point as number);
  if (optional !== undefined) {
    const excess = (optional.point as number) - scheme.optionalThreshold;
    if (excess > 0) points += BigInt(excess);
  }
  const max = BigInt(scheme.maxPoint);
  const gpa = points >= max * count ? max : roundToUnit(points, count, scheme.gpaUnit, scheme.mode);
  const gpaNumber = Number(gpa);
  const band = pickBand(scheme.gradeBands, (min) => gpaNumber >= min);
  return succeed({ ...base, outcome: "passed", gpa: gpaNumber, grade: band.grade });
}

/** One student's entry in an {@link ExamResult}. */
export type StudentEntry =
  | {
      readonly student_id: string;
      readonly status: "ok";
      readonly subjects: readonly SubjectResult[];
      readonly totals: OverallResult;
    }
  | {
      readonly student_id: string;
      readonly status: "error";
      readonly errors: readonly ResultsError[];
    };

/** Result of {@link computeExam}: every student, sorted by student id. */
export type ExamResult = {
  readonly engine_version: number;
  readonly students: readonly StudentEntry[];
};

/** Structural checks between scheme, subjects and students that zod cannot express. */
function crossCheck(exam: ReturnType<typeof examSchema.parse>): ResultsError[] {
  const errors: ResultsError[] = [];
  const err = (code: ResultsError["code"], path: string, message: string): void => {
    errors.push({ code, path, message });
  };
  const subjectIds = new Set<string>();
  const componentIds = new Map<string, Set<string>>();
  exam.subjects.forEach((subject, si) => {
    if (subjectIds.has(subject.id)) {
      err("duplicate_id", `subjects.${si}.id`, `Subject id ${subject.id} is used twice.`);
    }
    subjectIds.add(subject.id);
    const ids = new Set<string>();
    subject.components.forEach((component, ci) => {
      if (ids.has(component.id)) {
        err(
          "duplicate_id",
          `subjects.${si}.components.${ci}.id`,
          `Component id ${component.id} is used twice in subject ${subject.id}.`,
        );
      }
      ids.add(component.id);
    });
    componentIds.set(subject.id, ids);
    const codes = new Set(subject.components.map((c) => c.code));
    (subject.pass_rule?.groups ?? []).forEach((group, gi) => {
      for (const code of group.codes) {
        if (!codes.has(code)) {
          err(
            "unknown_group_code",
            `subjects.${si}.pass_rule.groups.${gi}`,
            `Group code ${code} matches no component of subject ${subject.id}.`,
          );
        }
      }
    });
  });
  exam.scheme.pass.groups.forEach((group, gi) => {
    for (const code of group.codes) {
      if (!exam.subjects.some((s) => s.components.some((c) => c.code === code))) {
        err(
          "unknown_group_code",
          `scheme.pass.groups.${gi}`,
          `Group code ${code} matches no component of any subject.`,
        );
      }
    }
  });
  const studentIds = new Set<string>();
  exam.students.forEach((student, index) => {
    if (studentIds.has(student.id)) {
      err("duplicate_id", `students.${index}.id`, `Student id ${student.id} is used twice.`);
    }
    studentIds.add(student.id);
    for (const id of student.subject_ids ?? []) {
      if (!subjectIds.has(id)) {
        err(
          "unknown_reference",
          `students.${index}.subject_ids`,
          `Student ${student.id} is enrolled in unknown subject ${id}.`,
        );
      }
    }
    const enrolled = student.subject_ids ?? [...subjectIds];
    const optional = student.optional_subject_id;
    if (optional !== null && optional !== undefined && !enrolled.includes(optional)) {
      err(
        "unknown_reference",
        `students.${index}.optional_subject_id`,
        `Optional subject ${optional} is not one of student ${student.id}'s subjects.`,
      );
    }
    for (const [subjectId, marks] of Object.entries(student.marks)) {
      const ids = componentIds.get(subjectId);
      if (ids === undefined) {
        err(
          "unknown_reference",
          `students.${index}.marks.${subjectId}`,
          `Marks for unknown subject ${subjectId} (student ${student.id}).`,
        );
        continue;
      }
      for (const componentId of Object.keys(marks)) {
        if (!ids.has(componentId)) {
          err(
            "unknown_reference",
            `students.${index}.marks.${subjectId}.${componentId}`,
            `Marks for unknown component ${componentId} of subject ${subjectId} (student ${student.id}).`,
          );
        }
      }
    }
  });
  return errors;
}

/**
 * Computes the results of a whole exam: validates the input (scheme, subjects, students), then
 * computes every student's subjects and overall result.
 *
 * Problems in the scheme or exam definition (including unknown ids, duplicate ids and group codes
 * that match no component) fail the whole call with a list of errors. Problems in one student's
 * marks (missing or out-of-range marks) fail only that student, as a `status: "error"` entry.
 * Students are sorted by id and subjects by subject id, so the same input always gives the same
 * output. Never throws for bad user data.
 */
export function computeExam(input: ExamInput): EngineResult<ExamResult> {
  const parsed = examSchema.safeParse(input);
  if (!parsed.success)
    return failWith(zodErrors(parsed.error, "").map((e) => ({ ...e, code: "invalid_input" })));
  const exam = parsed.data;
  const scheme = schemeFromParsed(exam.scheme, "scheme");
  if (!scheme.ok) return scheme;
  const errors = crossCheck(exam);
  if (errors.length > 0) return failWith(errors);

  const subjects = [...exam.subjects].sort((a, b) => compareIds(a.id, b.id));
  const students = [...exam.students].sort((a, b) => compareIds(a.id, b.id));
  const prepared = subjects.map((subject) => prepareSubject(scheme.value, subject));
  const entries: StudentEntry[] = students.map((student) => {
    const enrolled = new Set(student.subject_ids ?? subjects.map((s) => s.id));
    const results: SubjectResult[] = [];
    const problems: ResultsError[] = [];
    for (const subject of prepared) {
      if (!enrolled.has(subject.id)) continue;
      const result = runSubject(subject, student.marks[subject.id]);
      if (result.ok) results.push(result.value);
      else problems.push(...result.errors);
    }
    if (problems.length > 0) return { student_id: student.id, status: "error", errors: problems };
    const overall = computeOverall({
      scheme: scheme.value,
      subjects: results,
      optional_subject_id: student.optional_subject_id,
    });
    if (!overall.ok) return { student_id: student.id, status: "error", errors: overall.errors };
    return { student_id: student.id, status: "ok", subjects: results, totals: overall.value };
  });
  return succeed({ engine_version: ENGINE_VERSION, students: entries });
}
