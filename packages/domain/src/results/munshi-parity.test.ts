import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { type ExamInput, type ResultRow, computeExam, rankResults } from "../index.js";

/**
 * Parity with Munshi (task M2-D3). Each fixture in `fixtures/munshi-parity/` holds one Munshi exam:
 * the marks, and the answers Munshi's own code (`docs/samples/munshi/compute.js`) gave for them,
 * produced by `scripts/munshi-parity-fixtures.mjs`. The SMS engine runs on the same marks and every
 * value both systems define (total, average, grade, merit position) is compared. Where they differ,
 * the difference must be written down in `differences.json` with a cause explained in
 * `docs/research/munshi-parity.md`; an unlisted difference, or a listed one that no longer
 * happens, fails the test. The engine is never changed to match Munshi (Leader ruling needed).
 */

const dir = fileURLToPath(new URL("../../fixtures/munshi-parity/", import.meta.url));
const repo = fileURLToPath(new URL("../../../../", import.meta.url));

type MunshiValues = {
  total: number | null;
  average: number | null;
  grade: string | null;
  merit_rank: number | null;
  mark_issues?: Record<string, string>;
};

type Fixture = {
  id: string;
  source: {
    backup: string | null;
    synthetic: boolean;
    munshi_code: string;
    has_merit_rank: boolean;
    merit_top_n: number | null;
  };
  scheme: ExamInput["scheme"];
  subjects: ExamInput["subjects"];
  students: {
    id: string;
    roll: number | null;
    marks: Record<string, Record<string, number>>;
    munshi: MunshiValues;
  }[];
};

type Difference = {
  fixture: string;
  student: string;
  metric: string;
  cause: string;
  /** Munshi's value: marks and averages in hundredths (a percent in hundredths of a percent). */
  munshi: string | number | null;
  sms: string | number | null;
};

type Observed = Omit<Difference, "cause">;

const fixtures: Fixture[] = readdirSync(dir)
  .filter((name) => name.startsWith("P-") && name.endsWith(".json"))
  .sort()
  .map((name) => JSON.parse(readFileSync(dir + name, "utf8")) as Fixture);
const declared = JSON.parse(readFileSync(dir + "differences.json", "utf8")) as Difference[];
const index = JSON.parse(readFileSync(dir + "index.json", "utf8")) as {
  backups: { file: string; forms: { form_id: number; compared: boolean; responses: number }[] }[];
};
const researchDoc = readFileSync(repo + "docs/research/munshi-parity.md", "utf8");

const byKey = (a: Observed, b: Observed): number =>
  `${a.fixture}/${a.student}/${a.metric}`.localeCompare(`${b.fixture}/${b.student}/${b.metric}`);

/** Runs the SMS engine on a fixture and lists every value that differs from Munshi. */
function compare(fixture: Fixture): {
  compared: number;
  byMetric: Record<string, number>;
  differences: Observed[];
} {
  const result = computeExam({
    scheme: fixture.scheme,
    subjects: fixture.subjects,
    students: fixture.students.map((s) => ({ id: s.id, marks: s.marks })),
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  const entries = new Map(result.value.students.map((e) => [e.student_id, e]));

  const rows: ResultRow[] = [];
  for (const student of fixture.students) {
    const entry = entries.get(student.id);
    if (entry?.status === "ok") {
      rows.push({
        student_id: student.id,
        roll: student.roll ?? 0,
        section_id: null,
        totals: entry.totals,
        subjects: entry.subjects,
      });
    }
  }
  // Munshi ranks everyone by total with equal totals sharing a rank (dense) and includes failed students.
  const ranked = rankResults(rows, {
    order: ["total_desc"],
    ties: "dense",
    scopes: ["class"],
    include_failed: true,
  });
  if (!ranked.ok) throw new Error(JSON.stringify(ranked.errors));
  const rankOf = new Map(ranked.value.map((r) => [r.student_id, r.class_rank]));

  let compared = 0;
  const byMetric: Record<string, number> = {};
  const differences: Observed[] = [];
  const check = (
    student: string,
    metric: string,
    munshi: string | number | null,
    sms: string | number | null,
  ): void => {
    compared += 1;
    byMetric[metric] = (byMetric[metric] ?? 0) + 1;
    if (munshi !== sms) differences.push({ fixture: fixture.id, student, metric, munshi, sms });
  };

  for (const student of fixture.students) {
    const entry = entries.get(student.id);
    if (entry?.status !== "ok") {
      const codes = entry?.status === "error" ? entry.errors.map((e) => e.code).join(",") : "none";
      check(student.id, "status", "computed", `error:${codes}`);
      continue;
    }
    const { total, average, grade, merit_rank: merit } = student.munshi;
    if (total !== null) check(student.id, "total", Math.round(total * 100), entry.totals.total);
    if (average !== null) {
      check(student.id, "average", Math.round(average * 100), entry.totals.average_percent_bp);
    }
    if (grade !== null) check(student.id, "grade", grade, entry.totals.grade);
    if (fixture.source.has_merit_rank) {
      const rank = rankOf.get(student.id) ?? null;
      const top = fixture.source.merit_top_n ?? Number.MAX_SAFE_INTEGER;
      check(student.id, "merit_rank", merit, rank !== null && rank <= top ? rank : null);
    }
  }
  return { compared, byMetric, differences };
}

const results = fixtures.map((fixture) => ({ fixture, ...compare(fixture) }));

describe("Munshi parity (docs/research/munshi-parity.md)", () => {
  it("has a fixture for every Munshi exam that has marks, in both backups", () => {
    expect(index.backups.map((b) => b.file)).toEqual([
      "docs/samples/munshi/nomborpotro-backup-2026-09-01.anonymised.json",
      "docs/samples/munshi/nomborpotro-backup-2026-10-01.anonymised.json",
    ]);
    const wanted = index.backups.flatMap((b) =>
      b.forms.filter((f) => f.compared).map((f) => `${b.file}#${f.form_id}`),
    );
    const have = fixtures
      .filter((f) => !f.source.synthetic)
      .map((f) => `${f.source.backup}#${f.id.replace(/^.*form/, "")}`);
    expect(have.sort()).toEqual(wanted.sort());
    // every exam without marks is listed too, so nothing is skipped silently
    expect(index.backups.flatMap((b) => b.forms.filter((f) => !f.compared))).toEqual(
      expect.arrayContaining([expect.objectContaining({ responses: 0 })]),
    );
  });

  it("names its sources: the Munshi code and the backup, and both files exist", () => {
    for (const fixture of fixtures) {
      expect(existsSync(repo + fixture.source.munshi_code), fixture.id).toBe(true);
      if (!fixture.source.synthetic) {
        expect(existsSync(repo + (fixture.source.backup as string)), fixture.id).toBe(true);
      }
    }
  });

  it("holds no student names: students are numbered ids with marks only", () => {
    for (const fixture of fixtures) {
      for (const student of fixture.students) {
        expect(Object.keys(student).sort()).toEqual(["id", "marks", "munshi", "roll"]);
        expect(student.id, fixture.id).toMatch(/^s\d+$/);
      }
    }
  });

  for (const { fixture, differences } of results) {
    it(`${fixture.id}: agrees with Munshi except for the documented differences`, () => {
      const expected = declared
        .filter((d) => d.fixture === fixture.id)
        .map(({ cause: _cause, ...rest }) => rest);
      expect(differences.sort(byKey)).toEqual(expected.sort(byKey));
    });
  }

  it("explains every documented difference with a cause that is written up", () => {
    for (const difference of declared) {
      expect(difference.cause).toMatch(/^D-\d+$/);
      expect(researchDoc, difference.cause).toContain(`### ${difference.cause} `);
      expect(fixtures.map((f) => f.id)).toContain(difference.fixture);
    }
  });

  it("flags the same mark above full marks that Munshi flags", () => {
    let flagged = 0;
    for (const { fixture, differences } of results) {
      for (const student of fixture.students) {
        if (student.munshi.mark_issues === undefined) continue;
        flagged += 1;
        expect(Object.values(student.munshi.mark_issues)).toEqual(["over"]);
        const status = differences.find((d) => d.student === student.id && d.metric === "status");
        expect(status?.sms).toBe("error:mark_out_of_range");
      }
    }
    expect(flagged).toBe(1);
  });

  it("counts what was compared (the numbers quoted in the research note)", () => {
    const byMetric: Record<string, number> = {};
    for (const r of results) {
      for (const [metric, n] of Object.entries(r.byMetric))
        byMetric[metric] = (byMetric[metric] ?? 0) + n;
    }
    const real = results.filter((r) => !r.fixture.source.synthetic);
    expect({
      fixtures: fixtures.length,
      backup_exams: real.length,
      backup_students: real.reduce((n, r) => n + r.fixture.students.length, 0),
      backup_values: real.reduce((n, r) => n + r.compared, 0),
      backup_differences: real.reduce((n, r) => n + r.differences.length, 0),
      probe_students: results
        .filter((r) => r.fixture.source.synthetic)
        .reduce((n, r) => n + r.fixture.students.length, 0),
      all_values: results.reduce((n, r) => n + r.compared, 0),
      all_differences: results.reduce((n, r) => n + r.differences.length, 0),
      by_metric: byMetric,
    }).toEqual({
      fixtures: 5,
      backup_exams: 3,
      backup_students: 33,
      backup_values: 75,
      backup_differences: 3,
      probe_students: 12,
      all_values: 116,
      all_differences: 8,
      by_metric: { average: 16, grade: 16, merit_rank: 39, status: 2, total: 43 },
    });
  });
});
