import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { computeExam } from "./compute.js";
import { BD_GENERAL_GPA5 } from "./presets.js";
import {
  rankResults,
  topRanked,
  type RankedRow,
  type RankingConfig,
  type ResultRow,
} from "./ranking.js";
import { type ExamInput } from "./schema.js";
import { makeRow, subject } from "./testing/rows.js";

type FixtureRow = {
  student_id: string;
  roll: number;
  section_id: string;
  outcome: "passed" | "failed" | "absent" | "withheld";
  total: number | null;
  gpa: number | null;
  subjects: Record<string, number | null>;
};
type Fixture = {
  id: string;
  title: string;
  config: RankingConfig;
  rows: FixtureRow[];
  expected: Record<string, [number | null, number | null]>;
};

const dir = fileURLToPath(new URL("../../fixtures/ranking/", import.meta.url));
const fixtures: Fixture[] = readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => JSON.parse(readFileSync(dir + name, "utf8")) as Fixture);

function toRow(row: FixtureRow): ResultRow {
  return makeRow({
    id: row.student_id,
    roll: row.roll,
    section: row.section_id,
    outcome: row.outcome,
    total: row.total,
    gpa: row.gpa,
    subjects: Object.entries(row.subjects).map(([id, total]) => subject(id, total)),
  });
}

function rank(rows: readonly ResultRow[], config: RankingConfig): RankedRow[] {
  const result = rankResults(rows, config);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return [...result.value];
}

const base: RankingConfig = {
  order: ["total_desc", "roll_asc"],
  ties: "competition",
  scopes: ["class"],
  include_failed: false,
};

describe("ranking fixtures", () => {
  it("loads the fixtures", () => {
    expect(fixtures.map((f) => f.id)).toEqual([
      "R-001",
      "R-002",
      "R-003",
      "R-004",
      "R-005",
      "R-006",
      "R-007",
    ]);
  });

  for (const fixture of fixtures) {
    it(`${fixture.id}: ${fixture.title}`, () => {
      const ranked = rank(fixture.rows.map(toRow), fixture.config);
      const actual = Object.fromEntries(
        ranked.map((r) => [r.student_id, [r.class_rank, r.section_rank]]),
      );
      expect(actual).toEqual(fixture.expected);
    });
  }
});

describe("rankResults through the engine (fixture T-001 and a failed and an absent student)", () => {
  it("ranks tied students equally and leaves failed and absent students unranked", () => {
    const exam: ExamInput = {
      scheme: BD_GENERAL_GPA5,
      subjects: [{ id: "s", components: [{ id: "w", code: "w", full: 100 }] }],
      students: [
        { id: "tie-a", marks: { s: { w: 9000 } } },
        { id: "tie-b", marks: { s: { w: 9000 } } },
        { id: "tie-c", marks: { s: { w: 7500 } } },
        { id: "fail", marks: { s: { w: 2000 } } },
        { id: "gone", marks: { s: { w: "absent" } } },
      ],
    };
    const computed = computeExam(exam);
    if (!computed.ok) throw new Error("unexpected");
    const rows: ResultRow[] = computed.value.students.map((entry, index) => {
      if (entry.status !== "ok") throw new Error("unexpected");
      return {
        student_id: entry.student_id,
        roll: index + 1,
        totals: entry.totals,
        subjects: entry.subjects,
      };
    });
    const config = { ...BD_GENERAL_GPA5.ranking } as RankingConfig;
    const ranked = Object.fromEntries(
      rank(rows, { ...config, scopes: ["class"] }).map((r) => [r.student_id, r.class_rank]),
    );
    expect(ranked).toEqual({ "tie-a": 1, "tie-b": 2, "tie-c": 3, fail: null, gone: null });
    // Without roll_asc the two 90s are a real tie.
    const tied = rank(rows, {
      ...config,
      scopes: ["class"],
      order: ["outcome", "total_desc", "gpa_desc"],
    });
    expect(Object.fromEntries(tied.map((r) => [r.student_id, r.class_rank]))).toEqual({
      "tie-a": 1,
      "tie-b": 1,
      "tie-c": 3,
      fail: null,
      gone: null,
    });
  });
});

describe("rankResults details", () => {
  it("returns every row sorted by student id and ranks nothing for an empty list", () => {
    expect(rank([], base)).toEqual([]);
    const ranked = rank(
      [
        makeRow({ id: "z", outcome: "passed", total: 1 }),
        makeRow({ id: "a", outcome: "passed", total: 2 }),
      ],
      base,
    );
    expect(ranked.map((r) => r.student_id)).toEqual(["a", "z"]);
    expect(ranked.map((r) => r.class_rank)).toEqual([1, 2]);
  });

  it("orders by gpa, then by the next key; a missing gpa ranks below a number", () => {
    const rows = [
      makeRow({ id: "x", roll: 1, outcome: "passed", total: 100, gpa: null }),
      makeRow({ id: "y", roll: 2, outcome: "passed", total: 100, gpa: 300 }),
      makeRow({ id: "w", roll: 3, outcome: "passed", total: 100, gpa: null }),
    ];
    const ranked = rank(rows, { ...base, order: ["gpa_desc", "roll_asc"] });
    expect(Object.fromEntries(ranked.map((r) => [r.student_id, r.class_rank]))).toEqual({
      y: 1,
      x: 2,
      w: 3,
    });
  });

  it("a missing total ranks below a number on total_desc", () => {
    const rows = [
      makeRow({ id: "n", roll: 1, outcome: "passed", total: null }),
      makeRow({ id: "m", roll: 2, outcome: "passed", total: 5 }),
    ];
    const ranked = rank(rows, base);
    expect(Object.fromEntries(ranked.map((r) => [r.student_id, r.class_rank]))).toEqual({
      m: 1,
      n: 2,
    });
  });

  it("ignores a subject that is not counted or not present for a student", () => {
    const rows = [
      makeRow({ id: "a", roll: 1, outcome: "passed", total: 1, subjects: [subject("m", 10)] }),
      makeRow({ id: "b", roll: 2, outcome: "passed", total: 1, subjects: [subject("m", null)] }),
      makeRow({
        id: "c",
        roll: 3,
        outcome: "passed",
        total: 1,
        subjects: [subject("m", 99, { status: "withheld" })],
      }),
      makeRow({ id: "d", roll: 4, outcome: "passed", total: 1, subjects: [subject("other", 50)] }),
    ];
    const ranked = rank(rows, { ...base, order: ["subject:m_desc", "roll_asc"] });
    expect(Object.fromEntries(ranked.map((r) => [r.student_id, r.class_rank]))).toEqual({
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    });
  });

  it("is stable when students are given in any order", () => {
    const rows = [
      makeRow({ id: "a", roll: 1, outcome: "passed", total: 5 }),
      makeRow({ id: "b", roll: 2, outcome: "passed", total: 5 }),
      makeRow({ id: "c", roll: 3, outcome: "passed", total: 4 }),
    ];
    const config: RankingConfig = { ...base, order: ["total_desc"] };
    expect(rank([...rows].reverse(), config)).toEqual(rank(rows, config));
  });

  it("does not require sections when only the class scope is on", () => {
    const ranked = rank([makeRow({ id: "a", outcome: "passed", total: 1, section: null })], base);
    expect(ranked[0]?.section_rank).toBeNull();
  });
});

describe("rankResults errors (returned, never thrown)", () => {
  const codes = (result: ReturnType<typeof rankResults>): string[] =>
    result.ok ? [] : result.errors.map((e) => `${e.code}@${e.path}`);

  it("rejects a malformed config", () => {
    expect(codes(rankResults([], { ...base, order: [] }))).toEqual([
      "invalid_config@ranking.order",
    ]);
    expect(codes(rankResults([], { ...base, scopes: [] }))).toEqual([
      "invalid_config@ranking.scopes",
    ]);
    expect(codes(rankResults([], { ...base, ties: "sparse" as "dense" }))).toEqual([
      "invalid_config@ranking.ties",
    ]);
  });

  it("rejects unknown and repeated keys, and a subject nobody has", () => {
    const rows = [makeRow({ id: "a", outcome: "passed", total: 1, subjects: [subject("m", 1)] })];
    expect(codes(rankResults(rows, { ...base, order: ["total_asc"] }))).toEqual([
      "invalid_config@ranking.order.0",
    ]);
    expect(codes(rankResults(rows, { ...base, order: ["subject:_desc"] }))).toEqual([
      "invalid_config@ranking.order.0",
    ]);
    expect(codes(rankResults(rows, { ...base, order: ["total_desc", "total_desc"] }))).toEqual([
      "invalid_config@ranking.order.1",
    ]);
    expect(codes(rankResults(rows, { ...base, order: ["subject:nope_desc"] }))).toEqual([
      "unknown_reference@ranking.order.0",
    ]);
    expect(rankResults([], { ...base, order: ["subject:nope_desc"] }).ok).toBe(true);
  });

  it("rejects repeated students and non-integer rolls", () => {
    const a = makeRow({ id: "a", outcome: "passed", total: 1 });
    expect(codes(rankResults([a, a], base))).toEqual(["duplicate_id@rows.1.student_id"]);
    expect(codes(rankResults([{ ...a, roll: 1.5 }], base))).toEqual(["invalid_input@rows.0.roll"]);
  });

  it("requires a section for ranked students when the section scope is on, and only for them", () => {
    const config: RankingConfig = { ...base, scopes: ["section"] };
    const noSection = makeRow({ id: "a", outcome: "passed", total: 1, section: null });
    const undef = { ...makeRow({ id: "b", outcome: "passed", total: 1 }), section_id: undefined };
    expect(codes(rankResults([noSection, undef], config))).toEqual([
      "invalid_input@rows.0.section_id",
      "invalid_input@rows.1.section_id",
    ]);
    const unranked = makeRow({ id: "c", outcome: "absent", section: null });
    expect(rankResults([unranked], config).ok).toBe(true);
  });
});

describe("topRanked", () => {
  const ranked: RankedRow[] = [
    { student_id: "d", class_rank: 4, section_rank: null },
    { student_id: "b", class_rank: 2, section_rank: null },
    { student_id: "x", class_rank: null, section_rank: null },
    { student_id: "a", class_rank: 1, section_rank: null },
    { student_id: "c", class_rank: 2, section_rank: null },
  ];
  it("returns everyone at rank n or better, ordered by rank then id, skipping unranked", () => {
    expect(topRanked(ranked, 2).map((r) => r.student_id)).toEqual(["a", "b", "c"]);
    expect(topRanked(ranked, 10).map((r) => r.student_id)).toEqual(["a", "b", "c", "d"]);
  });
  it("returns nothing for an invalid n", () => {
    for (const n of [0, -1, 1.5, Number.NaN]) expect(topRanked(ranked, n)).toEqual([]);
  });
});

describe("property: ranks are consistent with the configured order", () => {
  const keys = ["outcome", "total_desc", "gpa_desc", "roll_asc"] as const;
  type Key = (typeof keys)[number];

  /** Independent reference comparison of two rows on one key (not shared with the implementation). */
  function byKey(key: Key, a: ResultRow, b: ResultRow): number {
    const up = (x: number | null, y: number | null): number => {
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return y - x;
    };
    if (key === "outcome")
      return Number(a.totals.outcome === "failed") - Number(b.totals.outcome === "failed");
    if (key === "total_desc") return up(a.totals.total, b.totals.total);
    if (key === "gpa_desc") return up(a.totals.gpa, b.totals.gpa);
    return a.roll - b.roll;
  }

  const rowArb = fc.record({
    outcome: fc.constantFrom("passed", "failed", "absent", "withheld"),
    total: fc.option(fc.integer({ min: 0, max: 6 }), { nil: null }),
    gpa: fc.option(fc.integer({ min: 0, max: 3 }), { nil: null }),
    section: fc.constantFrom("A", "B"),
  });

  it("holds for any order, tie mode, scope and failed policy", () => {
    fc.assert(
      fc.property(
        fc.array(rowArb, { maxLength: 14 }),
        fc.shuffledSubarray([...keys], { minLength: 1 }),
        fc.constantFrom("competition", "dense"),
        fc.boolean(),
        (specs, order, ties, includeFailed) => {
          const rows = specs.map((s, i) =>
            makeRow({
              id: `s${String(i).padStart(2, "0")}`,
              roll: (i * 7) % 5,
              section: s.section,
              outcome: s.outcome,
              total: s.total,
              gpa: s.gpa,
            }),
          );
          const config: RankingConfig = {
            order,
            ties,
            scopes: ["class", "section"],
            include_failed: includeFailed,
          };
          const ranked = rank(rows, config);
          const compare = (a: ResultRow, b: ResultRow): number => {
            for (const key of order as Key[]) {
              const c = byKey(key, a, b);
              if (c !== 0) return c;
            }
            return 0;
          };
          const eligible = (r: ResultRow): boolean =>
            r.totals.outcome === "passed" || (includeFailed && r.totals.outcome === "failed");
          for (const scope of ["class_rank", "section_rank"] as const) {
            const inScope = rows.filter(eligible);
            const rankOf = (r: ResultRow): number | null =>
              ranked.find((x) => x.student_id === r.student_id)?.[scope] ?? null;
            // Unranked students never get a rank.
            for (const r of rows) if (!eligible(r)) expect(rankOf(r)).toBeNull();
            const values: number[] = [];
            for (const a of inScope) {
              const ra = rankOf(a) as number;
              expect(ra).toBeGreaterThanOrEqual(1);
              values.push(ra);
              for (const b of inScope) {
                if (scope === "section_rank" && a.section_id !== b.section_id) continue;
                const rb = rankOf(b) as number;
                const c = compare(a, b);
                if (c < 0) expect(ra).toBeLessThan(rb);
                if (c === 0) expect(ra).toBe(rb);
              }
            }
            if (ties === "dense" && scope === "class_rank") {
              const distinct = [...new Set(values)].sort((x, y) => x - y);
              expect(distinct).toEqual(distinct.map((_, i) => i + 1));
            }
            if (ties === "competition" && scope === "class_rank") {
              // A rank equals 1 + the number of students strictly ahead.
              for (const a of inScope) {
                const ahead = inScope.filter((b) => compare(b, a) < 0).length;
                expect(rankOf(a)).toBe(ahead + 1);
              }
            }
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});
