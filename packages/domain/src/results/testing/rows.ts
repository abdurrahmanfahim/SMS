import { type OverallResult, type SubjectResult } from "../compute.js";
import { type Outcome } from "../compute.js";
import { type ResultRow } from "../ranking.js";

/** Test helper: a minimal {@link SubjectResult}; `null` total means the subject is exempt. */
export function subject(
  subjectId: string,
  total: number | null,
  extra: Partial<SubjectResult> = {},
): SubjectResult {
  return {
    subject_id: subjectId,
    status: total === null ? "exempt" : "counted",
    components: [],
    total,
    full: total === null ? null : 10000,
    percent_bp: total,
    grade: null,
    point: null,
    passed: total === null ? null : true,
    all_absent: false,
    reasons: [],
    exact_total: null,
    ...extra,
  };
}

/** Test helper: a {@link ResultRow} with only the fields the ranking and stats code reads. */
export function makeRow(input: {
  id: string;
  roll?: number;
  section?: string | null;
  outcome: Outcome;
  total?: number | null;
  gpa?: number | null;
  grade?: string | null;
  subjects?: SubjectResult[];
  average_percent_bp?: number | null;
}): ResultRow {
  const totals: OverallResult = {
    outcome: input.outcome,
    total: input.total ?? null,
    full: input.total ?? null,
    average_percent_bp: input.average_percent_bp ?? null,
    gpa: input.gpa ?? null,
    grade: input.grade ?? null,
    counted_subject_ids: [],
    failed_subject_ids: [],
  };
  return {
    student_id: input.id,
    roll: input.roll ?? 1,
    section_id: input.section ?? null,
    totals,
    subjects: input.subjects ?? [],
  };
}
