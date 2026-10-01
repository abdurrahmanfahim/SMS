import { describe, expect, it } from "vitest";

import { computeExam } from "./compute.js";
import { BD_GENERAL_GPA5 } from "./presets.js";
import type { ExamInput } from "./schema.js";

describe("performance", () => {
  it("computes 1,000 students by 12 subjects in under 1,000 ms", () => {
    const rule = {
      min_percent_total: 33,
      groups: [
        { codes: ["mcq"], min_percent: 33 },
        { codes: ["cq"], min_percent: 33 },
      ],
    };
    const subjects: ExamInput["subjects"] = Array.from({ length: 12 }, (_, i) => ({
      id: `sub${String(i).padStart(2, "0")}`,
      pass_rule: rule,
      components: [
        { id: "p1_mcq", paper: 1, code: "mcq", full: 25 },
        { id: "p1_cq", paper: 1, code: "cq", full: 50 },
        { id: "p2_mcq", paper: 2, code: "mcq", full: 25 },
        { id: "p2_cq", paper: 2, code: "cq", full: 50 },
      ],
    }));
    const students: ExamInput["students"] = Array.from({ length: 1000 }, (_, s) => ({
      id: `stu${String(s).padStart(4, "0")}`,
      optional_subject_id: "sub11",
      marks: Object.fromEntries(
        subjects.map((sub, j) => [
          sub.id,
          {
            p1_mcq: ((s * 7 + j * 3) % 26) * 100,
            p1_cq: ((s * 11 + j * 5) % 51) * 100,
            p2_mcq: ((s * 13 + j) % 26) * 100,
            p2_cq: ((s * 17 + j * 2) % 51) * 100,
          },
        ]),
      ),
    }));
    const input: ExamInput = { scheme: BD_GENERAL_GPA5, subjects, students };

    computeExam(input); // warm-up so JIT compilation is not measured
    const runs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const result = computeExam(input);
      runs.push(performance.now() - start);
      expect(result.ok).toBe(true);
    }
    const best = Math.min(...runs);
    console.info(
      `1000 students x 12 subjects: best ${best.toFixed(1)} ms, runs ${runs.map((r) => r.toFixed(1)).join(", ")}`,
    );
    // Leader ruling R-10: the engine takes about 40 to 80 ms here; shared CI runners are several
    // times slower, so the guard is 1,000 ms. It still catches an order-of-magnitude regression.
    expect(best).toBeLessThan(1000);
  });
});
