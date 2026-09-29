import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { type ExamInput, PRESETS, computeExam } from "../index.js";

const dir = fileURLToPath(new URL("../../fixtures/results/", import.meta.url));

type Fixture = {
  id: string;
  source: string;
  scheme: string | ExamInput["scheme"];
  exam: { subjects: ExamInput["subjects"] };
  students: ExamInput["students"];
  expected: { students: Record<string, unknown> };
};

const fixtures: Fixture[] = readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => JSON.parse(readFileSync(dir + name, "utf8")) as Fixture);

export function toInput(fixture: Fixture): ExamInput {
  const scheme =
    typeof fixture.scheme === "string"
      ? PRESETS[fixture.scheme as keyof typeof PRESETS]
      : fixture.scheme;
  return { scheme, subjects: fixture.exam.subjects, students: fixture.students };
}

describe("golden fixtures (packages/domain/fixtures/results)", () => {
  it("has the required fixtures from spec §10", () => {
    const ids = fixtures.map((f) => f.id);
    for (const id of ["G-001", "B-001", "C-001", "E-001", "W-001", "T-001", "F-001"]) {
      expect(ids).toContain(id);
    }
  });

  for (const fixture of fixtures) {
    it(`${fixture.id}: every student matches the expected result`, () => {
      expect(fixture.source.length).toBeGreaterThan(10);
      const result = computeExam(toInput(fixture));
      if (!result.ok) throw new Error(JSON.stringify(result.errors));
      expect(result.value.students.map((s) => s.student_id).sort()).toEqual(
        Object.keys(fixture.expected.students).sort(),
      );
      for (const entry of result.value.students) {
        const expected = fixture.expected.students[entry.student_id] as {
          subjects?: Record<string, unknown>;
        };
        const { subjects, ...rest } = expected;
        expect(entry, `${fixture.id}/${entry.student_id}`).toMatchObject(rest);
        if (subjects !== undefined && entry.status === "ok") {
          for (const [subjectId, want] of Object.entries(subjects)) {
            const got = entry.subjects.find((s) => s.subject_id === subjectId);
            expect(got, `${fixture.id}/${entry.student_id}/${subjectId}`).toMatchObject(
              want as object,
            );
          }
        }
      }
    });
  }

  it("G-001 reproduces the published sheet: GPA 3.67, grade A-, passed", () => {
    const g001 = fixtures.find((f) => f.id === "G-001") as Fixture;
    const result = computeExam(toInput(g001));
    if (!result.ok) throw new Error("unexpected");
    const [student] = result.value.students;
    if (student?.status !== "ok") throw new Error("unexpected");
    expect(student.totals.gpa).toBe(367);
    expect(student.totals.grade).toBe("A-");
    expect(student.totals.outcome).toBe("passed");
  });
});
