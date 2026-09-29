import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { computeExam } from "./compute.js";
import { BD_GENERAL_GPA5 } from "./presets.js";
import { type ExamInput } from "./schema.js";
import { snapshotChecksum } from "./snapshot.js";

const oneSubject = (full: number): ExamInput["subjects"] => [
  { id: "s", components: [{ id: "w", code: "w", full }] },
];

function gradePoint(full: number, mark: number): number {
  const r = computeExam({
    scheme: BD_GENERAL_GPA5,
    subjects: oneSubject(full),
    students: [{ id: "x", marks: { s: { w: mark } } }],
  });
  if (!r.ok) throw new Error("unexpected");
  const entry = r.value.students[0];
  if (entry?.status !== "ok") throw new Error("unexpected");
  return entry.subjects[0]?.point as number;
}

describe("properties", () => {
  it("more marks never lower a grade point", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 0, max: 20000 }),
        fc.integer({ min: 0, max: 20000 }),
        (full, a, b) => {
          const [low, high] = [Math.min(a, b, full * 100), Math.min(Math.max(a, b), full * 100)];
          expect(gradePoint(full, high)).toBeGreaterThanOrEqual(gradePoint(full, low));
        },
      ),
    );
  });

  it("GPA stays between 0 and max_point, whatever the marks", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 8 }),
        fc.boolean(),
        (marks, useOptional) => {
          const subjects: ExamInput["subjects"] = marks.map((_, i) => ({
            id: `s${i}`,
            components: [{ id: "w", code: "w", full: 100 }],
          }));
          const r = computeExam({
            scheme: BD_GENERAL_GPA5,
            subjects,
            students: [
              {
                id: "x",
                optional_subject_id: useOptional ? "s0" : null,
                marks: Object.fromEntries(marks.map((m, i) => [`s${i}`, { w: m }])),
              },
            ],
          });
          if (!r.ok) throw new Error("unexpected");
          const entry = r.value.students[0];
          if (entry?.status !== "ok") throw new Error("unexpected");
          const gpa = entry.totals.gpa as number;
          expect(gpa).toBeGreaterThanOrEqual(0);
          expect(gpa).toBeLessThanOrEqual(500);
          expect(Number.isSafeInteger(gpa)).toBe(true);
        },
      ),
    );
  });

  it("component marks add up exactly to the subject total (integers, no drift)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(fc.integer({ min: 1, max: 100 }), fc.double({ min: 0, max: 1, noNaN: true })),
          {
            minLength: 1,
            maxLength: 6,
          },
        ),
        (parts) => {
          const components = parts.map(([full], i) => ({
            id: `c${i}`,
            code: "w",
            paper: (i % 2) + 1,
            full,
          }));
          const marks = Object.fromEntries(
            parts.map(([full, share], i) => [`c${i}`, Math.trunc(share * full * 100)]),
          );
          const r = computeExam({
            scheme: BD_GENERAL_GPA5,
            subjects: [{ id: "s", components }],
            students: [{ id: "x", marks: { s: marks } }],
          });
          if (!r.ok) throw new Error("unexpected");
          const entry = r.value.students[0];
          if (entry?.status !== "ok") throw new Error("unexpected");
          const subject = entry.subjects[0]!;
          const sum = Object.values(marks).reduce((acc, v) => acc + v, 0);
          expect(subject.total).toBe(sum);
          expect(subject.full).toBe(parts.reduce((acc, [full]) => acc + full * 100, 0));
        },
      ),
    );
  });

  it("recomputing the same input gives an identical checksum", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 5 }),
        async (marks) => {
          const input: ExamInput = {
            scheme: BD_GENERAL_GPA5,
            subjects: oneSubject(100),
            students: marks.map((m, i) => ({ id: `st${i}`, marks: { s: { w: m } } })),
          };
          const a = computeExam(input);
          const b = computeExam(structuredClone(input));
          if (!a.ok || !b.ok) throw new Error("unexpected");
          const sum = (r: typeof a.value) =>
            snapshotChecksum({
              rules: { v: r.engine_version },
              rows: JSON.parse(JSON.stringify(r.students)),
            });
          expect(await sum(a.value)).toBe(await sum(b.value));
        },
      ),
    );
  });

  it("student input order does not change any student's result", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 6 }),
        (marks) => {
          const students = marks.map((m, i) => ({ id: `st${i}`, marks: { s: { w: m } } }));
          const forward = computeExam({
            scheme: BD_GENERAL_GPA5,
            subjects: oneSubject(100),
            students,
          });
          const backward = computeExam({
            scheme: BD_GENERAL_GPA5,
            subjects: oneSubject(100),
            students: [...students].reverse(),
          });
          expect(forward).toEqual(backward);
        },
      ),
    );
  });
});
