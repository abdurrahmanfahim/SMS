import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { computeExam } from "./compute.js";
import { BD_GENERAL_GPA5 } from "./presets.js";
import { type ResultRow } from "./ranking.js";
import { type ExamInput } from "./schema.js";
import { classStats } from "./stats.js";
import { makeRow, subject } from "./testing/rows.js";

const graded = (id: string, total: number | null, grade: string | null, extra = {}) =>
  subject(id, total, { grade, ...extra });

/** Six students; the expected numbers in the tests below were worked out by hand. */
const rows: ResultRow[] = [
  makeRow({
    id: "s1",
    section: "A",
    outcome: "passed",
    total: 17000,
    gpa: 500,
    grade: "A+",
    average_percent_bp: 8500,
    subjects: [graded("m", 9000, "A+"), graded("e", 8000, "A+")],
  }),
  makeRow({
    id: "s2",
    section: "A",
    outcome: "passed",
    total: 15000,
    gpa: 400,
    grade: "A",
    average_percent_bp: 7500,
    subjects: [graded("m", 8000, "A+"), graded("e", 7000, "A")],
  }),
  makeRow({
    id: "s3",
    section: "B",
    outcome: "failed",
    total: 9000,
    gpa: 0,
    grade: "F",
    average_percent_bp: 4500,
    subjects: [graded("m", 5000, "B"), graded("e", 4000, "F", { passed: false })],
  }),
  makeRow({
    id: "s4",
    section: "B",
    outcome: "absent",
    subjects: [
      graded("m", 0, "F", { all_absent: true, passed: false }),
      graded("e", 0, "F", { all_absent: true, passed: false }),
    ],
  }),
  makeRow({
    id: "s5",
    section: "B",
    outcome: "withheld",
    subjects: [graded("m", 6000, null, { status: "withheld" }), graded("e", 7000, "A")],
  }),
  makeRow({
    id: "s6",
    section: null,
    outcome: "passed",
    total: 10000,
    gpa: 300,
    grade: "B",
    average_percent_bp: 5000,
    subjects: [graded("m", null, null), graded("e", 5000, "B")],
  }),
];

describe("classStats", () => {
  const stats = classStats(rows);

  it("overall: outcome counts, pass rate over those who sat, averages, extremes and grades", () => {
    expect(stats.overall).toEqual({
      students: 6,
      passed: 3,
      failed: 1,
      absent: 1,
      withheld: 1,
      pass_rate_bp: 7500,
      average_total: 12750,
      average_percent_bp: 6375,
      average_gpa: 300,
      highest_total: 17000,
      lowest_total: 9000,
      grades: [
        { grade: "A+", count: 1 },
        { grade: "A", count: 1 },
        { grade: "B", count: 1 },
        { grade: "F", count: 1 },
      ],
    });
  });

  it("subjects: only students who appeared count; withheld, exempt and absent are reported apart", () => {
    expect(stats.subjects.map((s) => s.subject_id)).toEqual(["e", "m"]);
    expect(stats.subjects[1]).toEqual({
      subject_id: "m",
      counted: 4,
      appeared: 3,
      absent: 1,
      withheld: 1,
      exempt: 1,
      passed: 3,
      failed: 0,
      average_total: 7333, // 22000 / 3, rounded
      average_percent_bp: 7333,
      highest_total: 9000,
      lowest_total: 5000,
      pass_rate_bp: 10000,
      grades: [
        { grade: "A+", count: 2 },
        { grade: "B", count: 1 },
      ],
    });
    expect(stats.subjects[0]).toEqual({
      subject_id: "e",
      counted: 6,
      appeared: 5,
      absent: 1,
      withheld: 0,
      exempt: 0,
      passed: 4,
      failed: 1,
      average_total: 6200,
      average_percent_bp: 6200,
      highest_total: 8000,
      lowest_total: 4000,
      pass_rate_bp: 8000,
      grades: [
        { grade: "A+", count: 1 },
        { grade: "A", count: 2 },
        { grade: "B", count: 1 },
        { grade: "F", count: 1 },
      ],
    });
  });

  it("sections: one entry each for comparison, no-section last", () => {
    expect(stats.sections.map((s) => s.section_id)).toEqual(["A", "B", null]);
    const [a, b, none] = stats.sections;
    expect(a).toMatchObject({
      students: 2,
      passed: 2,
      failed: 0,
      pass_rate_bp: 10000,
      average_total: 16000,
      average_percent_bp: 8000,
      average_gpa: 450,
      highest_total: 17000,
      lowest_total: 15000,
      grades: [
        { grade: "A+", count: 1 },
        { grade: "A", count: 1 },
      ],
    });
    expect(b).toMatchObject({
      students: 3,
      passed: 0,
      failed: 1,
      absent: 1,
      withheld: 1,
      pass_rate_bp: 0,
      average_total: 9000,
      average_gpa: 0,
      grades: [{ grade: "F", count: 1 }],
    });
    expect(none).toMatchObject({
      students: 1,
      passed: 1,
      pass_rate_bp: 10000,
      average_total: 10000,
    });
  });

  it("an empty class gives zero counts and null averages", () => {
    const empty = classStats([]);
    expect(empty.subjects).toEqual([]);
    expect(empty.sections).toEqual([]);
    expect(empty.overall).toEqual({
      students: 0,
      passed: 0,
      failed: 0,
      absent: 0,
      withheld: 0,
      pass_rate_bp: null,
      average_total: null,
      average_percent_bp: null,
      average_gpa: null,
      highest_total: null,
      lowest_total: null,
      grades: [],
    });
  });

  it("a class where nobody sat has no pass rate or averages", () => {
    const only = classStats([
      makeRow({
        id: "a",
        outcome: "absent",
        subjects: [graded("m", 0, "F", { all_absent: true })],
      }),
    ]);
    expect(only.overall).toMatchObject({
      students: 1,
      absent: 1,
      pass_rate_bp: null,
      average_total: null,
    });
    expect(only.subjects[0]).toMatchObject({
      appeared: 0,
      absent: 1,
      pass_rate_bp: null,
      average_total: null,
      highest_total: null,
      grades: [],
    });
  });

  it("rounds averages and rates half up, never down", () => {
    const pair = [
      makeRow({ id: "a", outcome: "passed", total: 1, gpa: 1 }),
      makeRow({ id: "b", outcome: "failed", total: 2, gpa: 2 }),
    ];
    expect(classStats(pair).overall).toMatchObject({
      average_total: 2,
      average_gpa: 2,
      pass_rate_bp: 5000,
    });
    const thirds = [
      makeRow({ id: "a", outcome: "passed" }),
      makeRow({ id: "b", outcome: "failed" }),
      makeRow({ id: "c", outcome: "failed" }),
    ];
    expect(classStats(thirds).overall.pass_rate_bp).toBe(3333);
    const twoThirds = [...thirds].reverse().map((r, i) => ({
      ...r,
      totals: { ...r.totals, outcome: i === 0 ? ("failed" as const) : ("passed" as const) },
    }));
    expect(classStats(twoThirds).overall.pass_rate_bp).toBe(6667);
  });

  it("percentage schemes have no GPA; ungraded entries are skipped and a missing percent counts as 0", () => {
    const pct = classStats([
      makeRow({
        id: "a",
        outcome: "passed",
        total: 5,
        gpa: null,
        grade: "First",
        average_percent_bp: null,
      }),
      makeRow({ id: "b", outcome: "passed", total: 5, gpa: null, grade: null }),
      makeRow({
        id: "c",
        outcome: "passed",
        total: 5,
        gpa: null,
        grade: "First",
        average_percent_bp: 7000,
      }),
    ]);
    expect(pct.overall.average_gpa).toBeNull();
    expect(pct.overall.grades).toEqual([{ grade: "First", count: 2 }]);
  });

  it("orders grades with equal best percent by name", () => {
    const tied = classStats([
      makeRow({ id: "a", outcome: "passed", grade: "B", average_percent_bp: 6000 }),
      makeRow({ id: "b", outcome: "passed", grade: "A", average_percent_bp: 6000 }),
    ]);
    expect(tied.overall.grades.map((g) => g.grade)).toEqual(["A", "B"]);
  });

  it("does not depend on the order of the rows", () => {
    expect(classStats([...rows].reverse())).toEqual(classStats(rows));
  });
});

describe("classStats through the engine", () => {
  it("matches the engine's own outcomes for a small exam", () => {
    const exam: ExamInput = {
      scheme: BD_GENERAL_GPA5,
      subjects: [{ id: "s", components: [{ id: "w", code: "w", full: 100 }] }],
      students: [
        { id: "a", marks: { s: { w: 9000 } } },
        { id: "b", marks: { s: { w: 6000 } } },
        { id: "c", marks: { s: { w: 2000 } } },
        { id: "d", marks: { s: { w: "absent" } } },
      ],
    };
    const computed = computeExam(exam);
    if (!computed.ok) throw new Error("unexpected");
    const engineRows: ResultRow[] = computed.value.students.map((entry, i) => {
      if (entry.status !== "ok") throw new Error("unexpected");
      return {
        student_id: entry.student_id,
        roll: i + 1,
        totals: entry.totals,
        subjects: entry.subjects,
      };
    });
    const stats = classStats(engineRows);
    expect(stats.overall).toMatchObject({
      students: 4,
      passed: 2,
      failed: 1,
      absent: 1,
      pass_rate_bp: 6667,
      highest_total: 9000,
      lowest_total: 2000,
      average_total: 5667,
    });
    expect(stats.subjects[0]).toMatchObject({
      subject_id: "s",
      appeared: 3,
      absent: 1,
      passed: 2,
      failed: 1,
      average_total: 5667,
      pass_rate_bp: 6667,
    });
    expect(stats.subjects[0]?.grades.map((g) => g.grade)).toEqual(["A+", "A-", "F"]);
  });
});

describe("property: class statistics are consistent", () => {
  const rowArb = fc.record({
    outcome: fc.constantFrom("passed", "failed", "absent", "withheld"),
    total: fc.option(fc.integer({ min: 0, max: 20000 }), { nil: null }),
    section: fc.constantFrom("A", "B", null),
  });

  it("counts partition the class, averages sit between the extremes, and order does not matter", () => {
    fc.assert(
      fc.property(fc.array(rowArb, { maxLength: 20 }), (specs) => {
        const list = specs.map((s, i) =>
          makeRow({ id: `s${i}`, outcome: s.outcome, total: s.total, section: s.section }),
        );
        const { overall, sections } = classStats(list);
        expect(overall.passed + overall.failed + overall.absent + overall.withheld).toBe(
          overall.students,
        );
        expect(sections.reduce((n, s) => n + s.students, 0)).toBe(list.length);
        if (overall.average_total !== null) {
          expect(overall.average_total).toBeGreaterThanOrEqual(overall.lowest_total as number);
          expect(overall.average_total).toBeLessThanOrEqual(overall.highest_total as number);
        }
        if (overall.pass_rate_bp !== null) {
          expect(overall.pass_rate_bp).toBeGreaterThanOrEqual(0);
          expect(overall.pass_rate_bp).toBeLessThanOrEqual(10000);
        }
        expect(classStats([...list].reverse())).toEqual(classStats(list));
      }),
      { numRuns: 200 },
    );
  });
});
