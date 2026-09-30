import { type z } from "zod";

import { type OverallResult, type SubjectResult } from "./compute.js";
import { zodErrors } from "./config.js";
import { failWith, succeed, type EngineResult, type ResultsError } from "./errors.js";
import { compareIds } from "./fixed.js";
import { rankingSchema } from "./schema.js";

/**
 * The `ranking` block of a grade scheme (spec §6): `order` is a list of sort keys, `ties` says how
 * equal students are numbered, `scopes` which rankings to compute and `include_failed` whether
 * failed students get a rank. Valid keys in `order` are `outcome` (passed before failed),
 * `gpa_desc`, `total_desc`, `subject:<subject id>_desc` (that subject's marks, highest first) and
 * `roll_asc`.
 */
export type RankingConfig = z.input<typeof rankingSchema>;

/**
 * One student's computed result plus the two facts ranking needs that the engine does not hold:
 * the roll number and the section. `totals` and `subjects` are exactly what `computeExam` returns
 * for the student (`StudentEntry` with status `ok`).
 */
export type ResultRow = {
  readonly student_id: string;
  /** Roll number, a whole number; used by the `roll_asc` key. */
  readonly roll: number;
  /** Section of the student; required for every ranked student when `scopes` has `section`. */
  readonly section_id?: string | null | undefined;
  readonly totals: OverallResult;
  readonly subjects: readonly SubjectResult[];
};

/** Rank of one student; `null` means the student has no rank in that scope. */
export type RankedRow = {
  readonly student_id: string;
  /** Position among all rows passed in (the class); `null` if not ranked or `class` is not in `scopes`. */
  readonly class_rank: number | null;
  /** Position within the student's section; `null` if not ranked or `section` is not in `scopes`. */
  readonly section_rank: number | null;
};

type Comparator = (a: ResultRow, b: ResultRow) => number;

const SUBJECT_KEY = /^subject:(.+)_desc$/;

/** Compares two optional whole numbers, highest first; a missing value is worse than any number. */
function descending(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a > b ? -1 : 1;
}

/** Marks of one subject for a row, or `null` when the subject did not count for the student. */
function subjectTotal(row: ResultRow, subjectId: string): number | null {
  const found = row.subjects.find((s) => s.subject_id === subjectId);
  return found?.status === "counted" ? found.total : null;
}

/** Validates `order` keys and builds one comparator per key. */
function buildComparators(
  order: readonly string[],
  rows: readonly ResultRow[],
  errors: ResultsError[],
): Comparator[] {
  const seen = new Set<string>();
  const comparators: Comparator[] = [];
  order.forEach((key, index) => {
    const path = `ranking.order.${index}`;
    if (seen.has(key)) {
      errors.push({ code: "invalid_config", path, message: `Ranking key ${key} is listed twice.` });
      return;
    }
    seen.add(key);
    if (key === "outcome") {
      comparators.push(
        (a, b) => Number(a.totals.outcome !== "passed") - Number(b.totals.outcome !== "passed"),
      );
    } else if (key === "gpa_desc") {
      comparators.push((a, b) => descending(a.totals.gpa, b.totals.gpa));
    } else if (key === "total_desc") {
      comparators.push((a, b) => descending(a.totals.total, b.totals.total));
    } else if (key === "roll_asc") {
      comparators.push((a, b) => a.roll - b.roll);
    } else {
      const subjectId = SUBJECT_KEY.exec(key)?.[1];
      if (subjectId === undefined) {
        errors.push({ code: "invalid_config", path, message: `Unknown ranking key ${key}.` });
      } else if (
        rows.length > 0 &&
        !rows.some((r) => r.subjects.some((s) => s.subject_id === subjectId))
      ) {
        errors.push({
          code: "unknown_reference",
          path,
          message: `No student has a result for subject ${subjectId}.`,
        });
      } else {
        comparators.push((a, b) =>
          descending(subjectTotal(a, subjectId), subjectTotal(b, subjectId)),
        );
      }
    }
  });
  return comparators;
}

/** Numbers students already sorted by `compare`: equal students share a rank. */
function numberSorted(
  sorted: readonly ResultRow[],
  compare: Comparator,
  ties: "competition" | "dense",
): Map<string, number> {
  const ranks = new Map<string, number>();
  let dense = 0;
  let current = 0;
  sorted.forEach((row, index) => {
    const previous = sorted[index - 1];
    if (previous === undefined || compare(previous, row) !== 0) {
      dense += 1;
      current = ties === "dense" ? dense : index + 1;
    }
    ranks.set(row.student_id, current);
  });
  return ranks;
}

/**
 * Ranks students by the configured order (spec §6). Pure; never throws.
 *
 * - Sorting is by the keys of `config.order`, first key most important. Two students who are equal
 *   on every key are tied and share a rank: `competition` numbers them 1, 2, 2, 4 and `dense`
 *   numbers them 1, 2, 2, 3. Rank numbers start at 1. If `roll_asc` is in the order ties rarely
 *   occur because roll numbers are unique.
 * - `outcome` puts `passed` before `failed`. `gpa_desc` and `total_desc` use the stored hundredths;
 *   a missing value (for example no GPA under a percentage scheme) ranks below any number.
 *   `subject:<id>_desc` uses that subject's total marks; a subject that did not count for a
 *   student ranks that student below everyone who has it.
 * - Who is ranked: `passed` students always; `failed` students only if `include_failed`; `withheld`
 *   and `absent` students never (their ranks are `null`).
 * - `config.scopes` chooses the rankings: `class` ranks all rows together, `section` ranks each
 *   section on its own. A scope that is not listed gives `null`.
 * - The result lists every input row, sorted by student id.
 *
 * Returns errors (as values) for an invalid `config` (unknown or repeated key, an empty `order`,
 * a subject key no student has), a repeated `student_id`, a `roll` that is not a whole number, and
 * a missing `section_id` on a ranked student when the `section` scope is on.
 */
export function rankResults(
  rows: readonly ResultRow[],
  config: RankingConfig,
): EngineResult<readonly RankedRow[]> {
  const parsed = rankingSchema.safeParse(config);
  if (!parsed.success) return failWith(zodErrors(parsed.error, "ranking"));
  const { order, ties, scopes, include_failed: includeFailed } = parsed.data;

  const errors: ResultsError[] = [];
  const comparators = buildComparators(order, rows, errors);
  const ids = new Set<string>();
  rows.forEach((row, index) => {
    if (ids.has(row.student_id)) {
      errors.push({
        code: "duplicate_id",
        path: `rows.${index}.student_id`,
        message: `Student ${row.student_id} appears twice.`,
      });
    }
    ids.add(row.student_id);
    if (!Number.isSafeInteger(row.roll)) {
      errors.push({
        code: "invalid_input",
        path: `rows.${index}.roll`,
        message: `Roll of student ${row.student_id} must be a whole number.`,
      });
    }
  });

  const rankable = rows.filter(
    (row) => row.totals.outcome === "passed" || (includeFailed && row.totals.outcome === "failed"),
  );
  const wantsSection = scopes.includes("section");
  if (wantsSection) {
    rows.forEach((row, index) => {
      if (rankable.includes(row) && (row.section_id === undefined || row.section_id === null)) {
        errors.push({
          code: "invalid_input",
          path: `rows.${index}.section_id`,
          message: `Student ${row.student_id} has no section, but section ranking is on.`,
        });
      }
    });
  }
  if (errors.length > 0) return failWith(errors);

  const compare: Comparator = (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
  const sortedOf = (list: readonly ResultRow[]): ResultRow[] =>
    [...list].sort((a, b) => compare(a, b) || compareIds(a.student_id, b.student_id));

  const classRanks = scopes.includes("class")
    ? numberSorted(sortedOf(rankable), compare, ties)
    : new Map<string, number>();
  const sectionRanks = new Map<string, number>();
  if (wantsSection) {
    const sections = new Map<string, ResultRow[]>();
    for (const row of rankable) {
      const key = row.section_id as string;
      sections.set(key, [...(sections.get(key) ?? []), row]);
    }
    for (const members of sections.values()) {
      for (const [id, rank] of numberSorted(sortedOf(members), compare, ties)) {
        sectionRanks.set(id, rank);
      }
    }
  }

  const out: RankedRow[] = [...rows]
    .sort((a, b) => compareIds(a.student_id, b.student_id))
    .map((row) => ({
      student_id: row.student_id,
      class_rank: classRanks.get(row.student_id) ?? null,
      section_rank: sectionRanks.get(row.student_id) ?? null,
    }));
  return succeed(out);
}

/**
 * The students in the top `n` places of the class ranking: everyone whose `class_rank` is at most
 * `n`, ordered by rank then student id. Because tied students share a rank, this can return more
 * than `n` students (for example 1, 2, 2 with `n = 2` gives three), and with `dense` ties it counts
 * places, not students. Returns an empty list when `n` is not a whole number of at least 1.
 */
export function topRanked(ranked: readonly RankedRow[], n: number): RankedRow[] {
  if (!Number.isSafeInteger(n) || n < 1) return [];
  return ranked
    .filter((row) => row.class_rank !== null && row.class_rank <= n)
    .sort(
      (a, b) =>
        (a.class_rank as number) - (b.class_rank as number) ||
        compareIds(a.student_id, b.student_id),
    );
}
