import { type SubjectResult } from "./compute.js";
import { divRound, compareIds } from "./fixed.js";
import { type ResultRow } from "./ranking.js";

/** How many students got a grade. */
export type GradeCount = { readonly grade: string; readonly count: number };

/**
 * Statistics of one subject over the students who sat it. All marks are whole hundredths and all
 * rates and percentages are hundredths of a percent (`6650` is 66.50%).
 *
 * `counted` students had the subject counted; of those, `absent` were absent in every component
 * and `appeared` sat it. Averages, `highest_total`, `lowest_total`, `pass_rate_bp` and `grades`
 * are over `appeared` students only. `withheld` and `exempt` students are reported but excluded
 * from everything else. `failed` is every appeared student who did not pass.
 */
export type SubjectStats = {
  readonly subject_id: string;
  readonly counted: number;
  readonly appeared: number;
  readonly absent: number;
  readonly withheld: number;
  readonly exempt: number;
  readonly passed: number;
  readonly failed: number;
  /** Average of the subject totals, rounded half up to a whole hundredth; `null` if nobody appeared. */
  readonly average_total: number | null;
  /** Average of the subject percents (in hundredths of a percent); `null` if nobody appeared. */
  readonly average_percent_bp: number | null;
  readonly highest_total: number | null;
  readonly lowest_total: number | null;
  /** `passed / appeared` in hundredths of a percent, rounded half up; `null` if nobody appeared. */
  readonly pass_rate_bp: number | null;
  /** Grade counts, best grade first (by the best percent seen for the grade, then by name). */
  readonly grades: readonly GradeCount[];
};

/**
 * Statistics over a set of students (a whole class or one section). `passed` and `failed` are
 * outcomes; `absent` and `withheld` students are counted in `students` but excluded from every
 * average, `pass_rate_bp` and `grades`. Averages and extremes are over `passed` and `failed`
 * students; a failed student counts with the GPA and total stored for them. `average_gpa` is
 * `null` when no student has a GPA (percentage schemes).
 */
export type OverallStats = {
  readonly students: number;
  readonly passed: number;
  readonly failed: number;
  readonly absent: number;
  readonly withheld: number;
  /** `passed / (passed + failed)` in hundredths of a percent, rounded half up; `null` if nobody sat. */
  readonly pass_rate_bp: number | null;
  readonly average_total: number | null;
  readonly average_percent_bp: number | null;
  readonly average_gpa: number | null;
  readonly highest_total: number | null;
  readonly lowest_total: number | null;
  /** Overall grade counts, best first. */
  readonly grades: readonly GradeCount[];
};

/** {@link OverallStats} of one section; `section_id` is `null` for students with no section. */
export type SectionStats = OverallStats & { readonly section_id: string | null };

/** Result of {@link classStats}. */
export type ClassStats = {
  readonly overall: OverallStats;
  /** One entry per subject seen, sorted by subject id. */
  readonly subjects: readonly SubjectStats[];
  /** One entry per section (for comparing sections), sorted by section id, no-section last. */
  readonly sections: readonly SectionStats[];
};

type Summary = {
  readonly average: number | null;
  readonly highest: number | null;
  readonly lowest: number | null;
};

/** Average (rounded half up), highest and lowest of the numbers that are present. */
function summarize(values: readonly (number | null)[]): Summary {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return { average: null, highest: null, lowest: null };
  const sum = present.reduce((acc, value) => acc + BigInt(value), 0n);
  return {
    average: Number(divRound(sum, BigInt(present.length), "half_up")),
    highest: present.reduce((a, b) => (b > a ? b : a)),
    lowest: present.reduce((a, b) => (b < a ? b : a)),
  };
}

/** `part / whole` in hundredths of a percent, rounded half up; `null` when `whole` is 0. */
function rateBp(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Number(divRound(BigInt(part) * 10000n, BigInt(whole), "half_up"));
}

/** Counts grades; best grade first, where best means the highest percent seen for that grade. */
function distribution(
  entries: readonly { readonly grade: string | null; readonly percent_bp: number | null }[],
): GradeCount[] {
  const seen = new Map<string, { count: number; best: number }>();
  for (const entry of entries) {
    if (entry.grade === null) continue;
    const current = seen.get(entry.grade);
    seen.set(entry.grade, {
      count: (current?.count ?? 0) + 1,
      best: Math.max(current?.best ?? 0, entry.percent_bp ?? 0),
    });
  }
  return [...seen]
    .sort(([nameA, a], [nameB, b]) => b.best - a.best || compareIds(nameA, nameB))
    .map(([grade, value]) => ({ grade, count: value.count }));
}

function subjectStats(subjectId: string, results: readonly SubjectResult[]): SubjectStats {
  const counted = results.filter((r) => r.status === "counted");
  const appeared = counted.filter((r) => !r.all_absent);
  const passed = appeared.filter((r) => r.passed === true).length;
  const totals = summarize(appeared.map((r) => r.total));
  return {
    subject_id: subjectId,
    counted: counted.length,
    appeared: appeared.length,
    absent: counted.length - appeared.length,
    withheld: results.filter((r) => r.status === "withheld").length,
    exempt: results.filter((r) => r.status === "exempt").length,
    passed,
    failed: appeared.length - passed,
    average_total: totals.average,
    average_percent_bp: summarize(appeared.map((r) => r.percent_bp)).average,
    highest_total: totals.highest,
    lowest_total: totals.lowest,
    pass_rate_bp: rateBp(passed, appeared.length),
    grades: distribution(appeared),
  };
}

function overallStats(rows: readonly ResultRow[]): OverallStats {
  const count = (outcome: ResultRow["totals"]["outcome"]): number =>
    rows.filter((row) => row.totals.outcome === outcome).length;
  const passed = count("passed");
  const failed = count("failed");
  const sat = rows.filter(
    (row) => row.totals.outcome === "passed" || row.totals.outcome === "failed",
  );
  const totals = summarize(sat.map((row) => row.totals.total));
  return {
    students: rows.length,
    passed,
    failed,
    absent: count("absent"),
    withheld: count("withheld"),
    pass_rate_bp: rateBp(passed, passed + failed),
    average_total: totals.average,
    average_percent_bp: summarize(sat.map((row) => row.totals.average_percent_bp)).average,
    average_gpa: summarize(sat.map((row) => row.totals.gpa)).average,
    highest_total: totals.highest,
    lowest_total: totals.lowest,
    grades: distribution(
      sat.map((row) => ({ grade: row.totals.grade, percent_bp: row.totals.average_percent_bp })),
    ),
  };
}

/**
 * Class statistics for one exam (spec task M2-D2): per-subject average, highest, lowest, pass rate
 * and grade distribution; overall outcome counts, pass rate, averages and grade distribution; and
 * one {@link OverallStats} per section so sections can be compared. Pure, integer math only
 * (averages and rates are rounded half up), and it never throws. `rows` are the students of one
 * exam and class, each student once; the result does not depend on their order. An empty list
 * gives zero counts and `null` averages. For the top students use {@link rankResults} and
 * `topRanked`.
 */
export function classStats(rows: readonly ResultRow[]): ClassStats {
  const bySubject = new Map<string, SubjectResult[]>();
  const bySection = new Map<string | null, ResultRow[]>();
  for (const row of rows) {
    for (const result of row.subjects) {
      bySubject.set(result.subject_id, [...(bySubject.get(result.subject_id) ?? []), result]);
    }
    const section = row.section_id ?? null;
    bySection.set(section, [...(bySection.get(section) ?? []), row]);
  }
  return {
    overall: overallStats(rows),
    subjects: [...bySubject]
      .sort(([a], [b]) => compareIds(a, b))
      .map(([subjectId, results]) => subjectStats(subjectId, results)),
    sections: [...bySection]
      .sort(([a], [b]) => {
        if (a === null) return 1;
        return b === null ? -1 : compareIds(a, b);
      })
      .map(([sectionId, members]) => ({ section_id: sectionId, ...overallStats(members) })),
  };
}
