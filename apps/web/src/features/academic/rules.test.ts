import { describe, expect, it } from "vitest";

import { PRESETS, blankPreset, presetById, school110Preset } from "./presets";
import {
  checkYear,
  hasDuplicateName,
  matchByName,
  moveId,
  planPreset,
  rangesOverlap,
  sortOrders,
} from "./rules";

const y2026 = { id: "y26", startsOn: "2026-01-01", endsOn: "2026-12-31" };

describe("year rules", () => {
  it("treats shared end days as overlap (both ends inclusive)", () => {
    expect(rangesOverlap(y2026, { startsOn: "2026-12-31", endsOn: "2027-06-30" })).toBe(true);
    expect(rangesOverlap(y2026, { startsOn: "2027-01-01", endsOn: "2027-12-31" })).toBe(false);
  });
  it("accepts the next year directly after", () => {
    expect(checkYear({ startsOn: "2027-01-01", endsOn: "2027-12-31" }, [y2026])).toEqual({
      ok: true,
    });
  });
  it("rejects overlap and names the other year", () => {
    expect(checkYear({ startsOn: "2026-06-01", endsOn: "2027-05-31" }, [y2026])).toEqual({
      ok: false,
      reason: "overlap",
      overlapsWith: "y26",
    });
  });
  it("ignores the year being edited", () => {
    expect(checkYear({ id: "y26", startsOn: "2026-02-01", endsOn: "2026-11-30" }, [y2026])).toEqual(
      { ok: true },
    );
  });
  it("rejects reversed, equal and malformed dates", () => {
    expect(checkYear({ startsOn: "2026-05-01", endsOn: "2026-04-01" }, [])).toEqual({
      ok: false,
      reason: "end_before_start",
    });
    expect(checkYear({ startsOn: "2026-05-01", endsOn: "2026-05-01" }, [])).toEqual({
      ok: false,
      reason: "end_before_start",
    });
    expect(checkYear({ startsOn: "", endsOn: "2026-05-01" }, [])).toEqual({
      ok: false,
      reason: "invalid_dates",
    });
  });
});

describe("names and ordering", () => {
  it("compares names the way the database does", () => {
    expect(hasDuplicateName(" class 1 ", ["Class 1", null])).toBe(true);
    expect(hasDuplicateName("Class 2", ["Class 1"])).toBe(false);
    expect(hasDuplicateName("   ", ["  "])).toBe(false);
  });
  it("moves one place and stays put at the edges", () => {
    expect(moveId(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(moveId(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(moveId(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
    expect(moveId(["a", "b"], "zzz", "up")).toEqual(["a", "b"]);
  });
  it("numbers from one", () => {
    expect(sortOrders(["x", "y"])).toEqual([
      { id: "x", sortOrder: 1 },
      { id: "y", sortOrder: 2 },
    ]);
  });
});

describe("presets", () => {
  const empty = {
    levelNames: [],
    subjectNames: [],
    sectionKeys: [],
    levels: [],
    subjects: [],
    classSubjectKeys: [],
  };
  it("school-1-10 has ten levels, sections A and B and consistent references", () => {
    expect(school110Preset.levels).toHaveLength(10);
    expect(school110Preset.sectionNames).toEqual(["A", "B"]);
    const subjectKeys = new Set(school110Preset.subjects.map((s) => s.key));
    const levelKeys = new Set(school110Preset.levels.map((l) => l.key));
    for (const mapping of school110Preset.classSubjects) {
      expect(levelKeys.has(mapping.levelKey)).toBe(true);
      expect(new Set(mapping.subjectKeys).size).toBe(mapping.subjectKeys.length);
      for (const key of mapping.subjectKeys) expect(subjectKeys.has(key)).toBe(true);
    }
    expect(school110Preset.classSubjects).toHaveLength(10);
  });
  it("is offered with a blank start and found by id", () => {
    expect(PRESETS.map((p) => p.id)).toEqual(["school-1-10", "blank"]);
    expect(presetById("blank")).toBe(blankPreset);
    expect(presetById("madrasa")).toBeUndefined();
  });
  it("plans everything for an empty institution and nothing for a blank preset", () => {
    const plan = planPreset(school110Preset, empty);
    expect(plan.newLevels).toHaveLength(10);
    expect(plan.newSubjects).toHaveLength(9);
    expect(planPreset(blankPreset, empty).newLevels).toHaveLength(0);
  });
  it("skips what exists already, in either language, so applying twice is safe", () => {
    const plan = planPreset(school110Preset, {
      ...empty,
      levelNames: ["প্রথম শ্রেণি", "class 2"],
      subjectNames: ["Bangla"],
    });
    expect(plan.newLevels).toHaveLength(8);
    expect(plan.skippedLevels).toBe(2);
    expect(plan.skippedSubjects).toBe(1);
  });
  it("matches existing rows by either name", () => {
    const rows = [{ id: "1", nameBn: null, nameEn: "Class 1" }];
    expect(matchByName(rows, "প্রথম শ্রেণি", "class 1")?.id).toBe("1");
    expect(matchByName(rows, "x", "y")).toBeUndefined();
  });
});
