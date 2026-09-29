import { describe, expect, it } from "vitest";

import { computeExam, computeOverall, computeSubjectResults } from "./compute.js";
import type { SubjectResult } from "./compute.js";
import { parseGradeScheme } from "./config.js";
import type { GradeScheme } from "./config.js";
import { BD_GENERAL_GPA5 } from "./presets.js";
import { type ExamInput, type ParsedSubject, examSchema } from "./schema.js";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function scheme(patch: (config: Record<string, unknown>) => void = () => {}): GradeScheme {
  const config = clone(BD_GENERAL_GPA5) as unknown as Record<string, unknown>;
  patch(config);
  const result = parseGradeScheme(config);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

/** Builds a validated subject through the real zod schema. */
function subject(
  id: string,
  components: { id: string; code?: string; paper?: number; full: number; convert_to?: number }[],
  pass_rule?: ParsedSubject["pass_rule"],
): ParsedSubject {
  const exam = examSchema.parse({
    scheme: BD_GENERAL_GPA5,
    subjects: [{ id, components: components.map((c) => ({ code: c.id, ...c })), pass_rule }],
    students: [],
  });
  return exam.subjects[0] as ParsedSubject;
}

const written = (id: string) => subject(id, [{ id: "w", full: 100 }]);

function ok<T>(result: { ok: true; value: T } | { ok: false; errors: unknown }): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("computeSubjectResults", () => {
  it("adds papers and components, and reports percent, grade and point", () => {
    const s = subject("bn", [
      { id: "p1", paper: 1, full: 100 },
      { id: "p2", paper: 2, full: 100 },
    ]);
    const r = ok(
      computeSubjectResults({ scheme: scheme(), subject: s, marks: { p1: 6000, p2: 7301 } }),
    );
    expect(r).toMatchObject({
      total: 13301,
      full: 20000,
      percent_bp: 6651,
      grade: "A-",
      point: 350,
      passed: true,
    });
    expect(r.components.map((c) => c.id)).toEqual(["p1", "p2"]);
  });

  it("orders components by paper then id", () => {
    const s = subject("x", [
      { id: "b", paper: 2, full: 10 },
      { id: "z", paper: 1, full: 10 },
      { id: "a", paper: 1, full: 10 },
    ]);
    const r = ok(
      computeSubjectResults({ scheme: scheme(), subject: s, marks: { a: 1, b: 1, z: 1 } }),
    );
    expect(r.components.map((c) => c.id)).toEqual(["a", "z", "b"]);
  });

  it("converts components exactly (raw x convert_to / full)", () => {
    const s = subject("ct", [
      { id: "ct", full: 30, convert_to: 10 },
      { id: "w", full: 90 },
    ]);
    // ct 20/30 -> 6.6666..., w 45 -> total 51.666... of 100; exact fraction, no drift
    const r = ok(
      computeSubjectResults({ scheme: scheme(), subject: s, marks: { ct: 2000, w: 4500 } }),
    );
    expect(r.full).toBe(10000);
    expect(r.total).toBe(5167);
    expect(r.exact_total).toEqual({ num: "155000", den: "30" });
    expect(r.grade).toBe("B");
    const t = ok(
      computeSubjectResults({
        scheme: scheme((c) => ((c.rounding as Record<string, unknown>).mode = "truncate")),
        subject: s,
        marks: { ct: 2000, w: 4500 },
      }),
    );
    expect(t.total).toBe(5166);
  });

  it("rounds stored totals to the configured marks decimals only at the end", () => {
    const s = subject("ct", [{ id: "ct", full: 3, convert_to: 1 }]);
    const one = scheme((c) => ((c.rounding as Record<string, unknown>).marks_decimals = 1));
    expect(ok(computeSubjectResults({ scheme: one, subject: s, marks: { ct: 100 } })).total).toBe(
      30,
    );
  });

  it("uses band minimums inclusively, by cross-multiplication", () => {
    const s = written("a");
    const at = (mark: number) =>
      ok(computeSubjectResults({ scheme: scheme(), subject: s, marks: { w: mark } }));
    expect(at(7999).grade).toBe("A");
    expect(at(8000).grade).toBe("A+");
    expect(at(3299).grade).toBe("F");
    expect(at(3299).passed).toBe(false);
    expect(at(3300).grade).toBe("D");
    expect(at(0).reasons).toEqual([{ kind: "total_below_min" }]);
    expect(at(10000).percent_bp).toBe(10000);
  });

  it("applies group pass rules across papers and overrides the scheme default", () => {
    const rule = { min_percent_total: 33, groups: [{ codes: ["cq"], min_percent: 33 }] };
    const s = subject(
      "m",
      [
        { id: "p1_cq", code: "cq", paper: 1, full: 50 },
        { id: "p2_cq", code: "cq", paper: 2, full: 50 },
        { id: "mcq", code: "mcq", full: 100 },
      ],
      rule,
    );
    const fail = ok(
      computeSubjectResults({
        scheme: scheme(),
        subject: s,
        marks: { p1_cq: 1400, p2_cq: 1300, mcq: 6600 },
      }),
    );
    expect(fail).toMatchObject({
      passed: false,
      grade: "F",
      point: 0,
      reasons: [{ kind: "group_below_min", codes: ["cq"] }],
    });
    const pass = ok(
      computeSubjectResults({
        scheme: scheme(),
        subject: s,
        marks: { p1_cq: 1700, p2_cq: 1600, mcq: 6600 },
      }),
    );
    expect(pass.passed).toBe(true);
    // scheme default with a group
    const withGroup = scheme(
      (c) => ((c.pass as Record<string, unknown>).groups = [{ codes: ["w"], min_percent: 50 }]),
    );
    const w = ok(
      computeSubjectResults({ scheme: withGroup, subject: written("w"), marks: { w: 4000 } }),
    );
    expect(w.passed).toBe(false);
  });

  it("marks an absent component as 0 and fails the subject", () => {
    const s = subject("x", [
      { id: "a", full: 50 },
      { id: "b", full: 50 },
    ]);
    const r = ok(
      computeSubjectResults({ scheme: scheme(), subject: s, marks: { a: "absent", b: 5000 } }),
    );
    expect(r.components[0]).toMatchObject({ state: "absent", mark: null });
    expect(r).toMatchObject({ passed: false, all_absent: false, total: 5000 });
    expect(r.reasons).toEqual([{ kind: "absent_component", component_id: "a" }]);
    const all = ok(
      computeSubjectResults({ scheme: scheme(), subject: s, marks: { a: "absent", b: "absent" } }),
    );
    expect(all).toMatchObject({ all_absent: true, total: 0, passed: false });
  });

  it("excludes exempt components from the total and the denominator", () => {
    const s = subject("x", [
      { id: "a", full: 50 },
      { id: "b", full: 50 },
    ]);
    const r = ok(
      computeSubjectResults({ scheme: scheme(), subject: s, marks: { a: 4500, b: "exempt" } }),
    );
    expect(r).toMatchObject({ total: 4500, full: 5000, percent_bp: 9000, grade: "A+" });
    expect(r.components[1]).toMatchObject({ state: "exempt", mark: null });
  });

  it("skips a group whose components are all exempt", () => {
    const rule = { min_percent_total: 33, groups: [{ codes: ["prac"], min_percent: 50 }] };
    const s = subject(
      "x",
      [
        { id: "w", code: "w", full: 80 },
        { id: "prac", code: "prac", full: 20 },
      ],
      rule,
    );
    const r = ok(
      computeSubjectResults({ scheme: scheme(), subject: s, marks: { w: 6000, prac: "exempt" } }),
    );
    expect(r.passed).toBe(true);
  });

  it("makes a subject exempt when all components are exempt", () => {
    const r = ok(
      computeSubjectResults({ scheme: scheme(), subject: written("x"), marks: { w: "exempt" } }),
    );
    expect(r).toMatchObject({
      status: "exempt",
      total: null,
      grade: null,
      passed: null,
      exact_total: null,
    });
  });

  it("makes a subject withheld when any component is withheld", () => {
    const s = subject("x", [
      { id: "a", full: 50 },
      { id: "b", full: 50 },
    ]);
    const r = ok(
      computeSubjectResults({ scheme: scheme(), subject: s, marks: { a: 100, b: "withheld" } }),
    );
    expect(r).toMatchObject({ status: "withheld", total: null, grade: null });
  });

  it("blocks on missing marks by default and reports each component", () => {
    const s = subject("x", [
      { id: "a", full: 50 },
      { id: "b", full: 50 },
    ]);
    const r = computeSubjectResults({ scheme: scheme(), subject: s, marks: { a: 100 } });
    if (r.ok) throw new Error("expected an error");
    expect(r.errors).toEqual([expect.objectContaining({ code: "missing_marks", path: "x.b" })]);
    const none = computeSubjectResults({ scheme: scheme(), subject: s });
    expect(none.ok).toBe(false);
  });

  it("treats missing marks as absent when the policy says so", () => {
    const s = treatAbsent();
    const r = ok(computeSubjectResults({ scheme: s, subject: written("x") }));
    expect(r).toMatchObject({ passed: false, all_absent: true, total: 0 });
  });

  it("rejects marks above the component's full marks", () => {
    const r = computeSubjectResults({
      scheme: scheme(),
      subject: written("x"),
      marks: { w: 10001 },
    });
    if (r.ok) throw new Error("expected an error");
    expect(r.errors[0]).toMatchObject({ code: "mark_out_of_range", path: "x.w" });
  });

  it("gives null points for a percentage scheme", () => {
    const r = ok(
      computeSubjectResults({ scheme: percentage(), subject: written("x"), marks: { w: 6100 } }),
    );
    expect(r).toMatchObject({ grade: "First", point: null, passed: true });
    const f = ok(
      computeSubjectResults({ scheme: percentage(), subject: written("x"), marks: { w: 1000 } }),
    );
    expect(f).toMatchObject({ grade: "Fail", point: null, passed: false });
  });
});

function treatAbsent(): GradeScheme {
  return scheme((c) => (c.missing = "treat_as_absent"));
}

function percentage(): GradeScheme {
  const result = parseGradeScheme({
    version: 1,
    kind: "percentage_bands",
    bands: [
      { min: 0, grade: "Third" },
      { min: 45, grade: "Second" },
      { min: 60, grade: "First" },
    ],
    fail: { grade: "Fail" },
    pass: { min_percent_total: 33, groups: [] },
  });
  if (!result.ok) throw new Error("unexpected");
  return result.value;
}

/** A subject result with the fields the overall computation reads. */
function sr(
  id: string,
  total: number,
  full: number,
  point: number | null,
  passed = true,
  extra: Partial<SubjectResult> = {},
): SubjectResult {
  return {
    subject_id: id,
    status: "counted",
    components: [],
    total,
    full,
    percent_bp: 0,
    grade: "x",
    point,
    passed,
    all_absent: false,
    reasons: [],
    exact_total: { num: String(total), den: "1" },
    ...extra,
  };
}

describe("computeOverall (GPA scheme)", () => {
  const s = scheme();
  it("averages compulsory points and rounds half up", () => {
    const subjects = [350, 400, 300, 400, 350, 400].map((p, i) => sr(`s${i}`, 1, 1, p));
    const r = ok(computeOverall({ scheme: s, subjects }));
    expect(r).toMatchObject({ outcome: "passed", gpa: 367, grade: "A-" });
  });

  it("adds the optional bonus, keeps the optional out of the denominator and caps at max", () => {
    const base = [400, 400].map((p, i) => sr(`s${i}`, 1, 1, p));
    const r = ok(
      computeOverall({
        scheme: s,
        subjects: [...base, sr("opt", 1, 1, 400)],
        optional_subject_id: "opt",
      }),
    );
    expect(r.gpa).toBe(500); // (4+4+2)/2 = 5.00
    const capped = ok(
      computeOverall({
        scheme: s,
        subjects: [sr("a", 1, 1, 500), sr("opt", 1, 1, 500)],
        optional_subject_id: "opt",
      }),
    );
    expect(capped).toMatchObject({ gpa: 500, grade: "A+" });
    const low = ok(
      computeOverall({
        scheme: s,
        subjects: [...base, sr("opt", 1, 1, 100)],
        optional_subject_id: "opt",
      }),
    );
    expect(low.gpa).toBe(400); // no negative bonus
  });

  it("ignores a failed optional subject", () => {
    const r = ok(
      computeOverall({
        scheme: s,
        subjects: [sr("a", 1, 1, 400), sr("opt", 1, 1, 0, false)],
        optional_subject_id: "opt",
      }),
    );
    expect(r).toMatchObject({ outcome: "passed", gpa: 400, failed_subject_ids: ["opt"] });
  });

  it("treats the optional subject as compulsory when the option is disabled", () => {
    const off = scheme(
      (c) =>
        (((c.gpa as Record<string, unknown>).optional as Record<string, unknown>).enabled = false),
    );
    const r = ok(
      computeOverall({
        scheme: off,
        subjects: [sr("a", 1, 1, 400), sr("opt", 1, 1, 200)],
        optional_subject_id: "opt",
      }),
    );
    expect(r.gpa).toBe(300);
  });

  it("fails the student when a compulsory subject fails", () => {
    const r = ok(
      computeOverall({ scheme: s, subjects: [sr("a", 1, 1, 400), sr("b", 1, 1, 0, false)] }),
    );
    expect(r).toMatchObject({ outcome: "failed", gpa: 0, grade: "F", failed_subject_ids: ["b"] });
  });

  it("can keep computing a GPA when failing is switched off", () => {
    const soft = scheme(
      (c) => ((c.gpa as Record<string, unknown>).fail_if_any_compulsory_fails = false),
    );
    const r = ok(
      computeOverall({ scheme: soft, subjects: [sr("a", 1, 1, 400), sr("b", 1, 1, 0, false)] }),
    );
    expect(r).toMatchObject({ outcome: "passed", gpa: 200, grade: "C" });
  });

  it("truncates instead of rounding when configured", () => {
    const t = scheme((c) => ((c.rounding as Record<string, unknown>).mode = "truncate"));
    const subjects = [350, 400, 300, 400, 350, 400].map((p, i) => sr(`s${i}`, 1, 1, p));
    expect(ok(computeOverall({ scheme: t, subjects })).gpa).toBe(366);
  });

  it("rounds the GPA to fewer decimals", () => {
    const one = scheme((c) => ((c.rounding as Record<string, unknown>).gpa_decimals = 1));
    const subjects = [350, 400, 300, 400, 350, 400].map((p, i) => sr(`s${i}`, 1, 1, p));
    expect(ok(computeOverall({ scheme: one, subjects })).gpa).toBe(370);
  });

  it("returns withheld, absent and errors as values", () => {
    const w = ok(
      computeOverall({
        scheme: s,
        subjects: [
          sr("a", 1, 1, 400),
          sr("b", 0, 0, null, true, {
            status: "withheld",
            total: null,
            full: null,
            exact_total: null,
          }),
        ],
      }),
    );
    expect(w).toMatchObject({ outcome: "withheld", gpa: null, grade: null, total: null });
    const abs = ok(
      computeOverall({
        scheme: s,
        subjects: [
          sr("a", 0, 100, 0, false, { all_absent: true }),
          sr("b", 0, 100, 0, false, { all_absent: true }),
        ],
      }),
    );
    expect(abs).toMatchObject({ outcome: "absent", gpa: null, grade: null, total: 0 });
    const exempt = sr("e", 0, 0, null, true, {
      status: "exempt",
      total: null,
      full: null,
      exact_total: null,
    });
    const none = computeOverall({ scheme: s, subjects: [exempt] });
    if (none.ok) throw new Error("expected an error");
    expect(none.errors[0]?.code).toBe("no_counted_subjects");
    const noComp = computeOverall({
      scheme: s,
      subjects: [sr("opt", 1, 1, 400)],
      optional_subject_id: "opt",
    });
    if (noComp.ok) throw new Error("expected an error");
    expect(noComp.errors[0]?.code).toBe("no_compulsory_subjects");
    const unknown = computeOverall({
      scheme: s,
      subjects: [sr("a", 1, 1, 400)],
      optional_subject_id: "nope",
    });
    if (unknown.ok) throw new Error("expected an error");
    expect(unknown.errors[0]).toMatchObject({
      code: "unknown_reference",
      path: "optional_subject_id",
    });
  });

  it("sums exact fractions from converted subjects", () => {
    const a = sr("a", 5167, 10000, 300, true, { exact_total: { num: "155000", den: "30" } });
    const b = sr("b", 3333, 10000, 300, true, { exact_total: { num: "10000", den: "3" } });
    const r = ok(computeOverall({ scheme: s, subjects: [a, b] }));
    expect(r.total).toBe(8500);
    expect(r.average_percent_bp).toBe(4250);
  });
});

describe("computeOverall (percentage scheme)", () => {
  const p = percentage();
  it("passes with the average percent band", () => {
    const r = ok(
      computeOverall({
        scheme: p,
        subjects: [sr("a", 6000, 10000, null), sr("b", 7000, 10000, null)],
      }),
    );
    expect(r).toMatchObject({
      outcome: "passed",
      grade: "First",
      gpa: null,
      average_percent_bp: 6500,
    });
  });
  it("fails when any counted subject fails", () => {
    const r = ok(
      computeOverall({
        scheme: p,
        subjects: [sr("a", 6000, 10000, null), sr("b", 1000, 10000, null, false)],
      }),
    );
    expect(r).toMatchObject({ outcome: "failed", grade: "Fail", failed_subject_ids: ["b"] });
  });
});

describe("computeExam", () => {
  const base = (): ExamInput => ({
    scheme: BD_GENERAL_GPA5,
    subjects: [
      { id: "b", components: [{ id: "w", code: "w", full: 100 }] },
      { id: "a", components: [{ id: "w", code: "w", full: 100 }] },
    ],
    students: [
      { id: "s2", marks: { a: { w: 6000 }, b: { w: 7000 } } },
      { id: "s1", marks: { a: { w: 8000 }, b: { w: 8000 } } },
    ],
  });
  const errorsOf = (input: ExamInput) => {
    const r = computeExam(input);
    if (r.ok) throw new Error("expected an error");
    return r.errors;
  };

  it("sorts students and subjects, and versions the engine", () => {
    const r = ok(computeExam(base()));
    expect(r.engine_version).toBe(1);
    expect(r.students.map((s) => s.student_id)).toEqual(["s1", "s2"]);
    const first = r.students[0];
    if (first?.status !== "ok") throw new Error("unexpected");
    expect(first.subjects.map((s) => s.subject_id)).toEqual(["a", "b"]);
  });

  it("gives identical output for identical input", () => {
    expect(computeExam(base())).toEqual(computeExam(base()));
  });

  it("fails one student on missing marks without failing the others", () => {
    const input = base();
    (input.students[0] as { marks: Record<string, unknown> }).marks = { a: { w: 6000 } };
    const r = ok(computeExam(input));
    expect(r.students[1]).toMatchObject({ student_id: "s2", status: "error" });
    expect(r.students[0]).toMatchObject({ student_id: "s1", status: "ok" });
  });

  it("surfaces an overall error as a student error (no compulsory subject)", () => {
    const input = base();
    input.students = [
      { id: "s", subject_ids: ["a"], optional_subject_id: "a", marks: { a: { w: 6000 } } },
    ];
    const r = ok(computeExam(input));
    expect(r.students[0]).toMatchObject({ status: "error" });
  });

  it("honours per-student enrolment", () => {
    const input = base();
    input.students = [{ id: "s", subject_ids: ["a"], marks: { a: { w: 6000 } } }];
    const r = ok(computeExam(input));
    const only = r.students[0];
    if (only?.status !== "ok") throw new Error("unexpected");
    expect(only.subjects.map((x) => x.subject_id)).toEqual(["a"]);
  });

  it("rejects structurally invalid input", () => {
    const errors = errorsOf({ scheme: BD_GENERAL_GPA5, subjects: [], students: [] });
    expect(errors[0]).toMatchObject({ code: "invalid_input" });
    expect(errorsOf({} as ExamInput).length).toBeGreaterThan(0);
  });

  it("rejects an invalid scheme with its band error", () => {
    const input = base();
    const bad = clone(BD_GENERAL_GPA5) as { bands: { min: number }[] };
    bad.bands[2]!.min = 80;
    input.scheme = bad as never;
    expect(errorsOf(input)[0]).toMatchObject({ code: "bands_overlap", path: "scheme.bands" });
  });

  it("rejects duplicate ids", () => {
    const input = base();
    input.subjects.push({
      id: "a",
      components: [
        { id: "w", code: "w", full: 1 },
        { id: "w", code: "w", full: 1 },
      ],
    });
    input.students.push({ id: "s1", marks: {} });
    const codes = errorsOf(input).map((e) => e.path);
    expect(codes).toContain("subjects.2.id");
    expect(codes).toContain("subjects.2.components.1.id");
    expect(codes).toContain("students.2.id");
  });

  it("rejects group codes that match no component", () => {
    const input = base();
    (input.subjects[0] as { pass_rule?: unknown }).pass_rule = {
      min_percent_total: 33,
      groups: [{ codes: ["nope"], min_percent: 33 }],
    };
    const scheme = clone(BD_GENERAL_GPA5) as { pass: { groups: unknown[] } };
    scheme.pass.groups = [{ codes: ["ghost"], min_percent: 33 }];
    input.scheme = scheme as never;
    const errors = errorsOf(input);
    expect(errors.map((e) => e.code)).toEqual(["unknown_group_code", "unknown_group_code"]);
    expect(errors.map((e) => e.path)).toEqual([
      "subjects.0.pass_rule.groups.0",
      "scheme.pass.groups.0",
    ]);
  });

  it("accepts scheme group codes that match some subject's component", () => {
    const input = base();
    const scheme = clone(BD_GENERAL_GPA5) as { pass: { groups: unknown[] } };
    scheme.pass.groups = [{ codes: ["w"], min_percent: 33 }];
    input.scheme = scheme as never;
    expect(computeExam(input).ok).toBe(true);
  });

  it("rejects unknown subjects, components and optional subjects in student data", () => {
    const input = base();
    input.students = [
      { id: "x", subject_ids: ["zzz"], marks: {} },
      { id: "y", optional_subject_id: "zzz", marks: { nope: { w: 1 } } },
      { id: "z", marks: { a: { ghost: 1 } } },
      { id: "n", optional_subject_id: null, marks: {} },
    ];
    const errors = errorsOf(input);
    expect(errors.map((e) => e.code)).toEqual([
      "unknown_reference",
      "unknown_reference",
      "unknown_reference",
      "unknown_reference",
    ]);
    expect(errors.map((e) => e.path)).toEqual([
      "students.0.subject_ids",
      "students.1.optional_subject_id",
      "students.1.marks.nope",
      "students.2.marks.a.ghost",
    ]);
  });
});
