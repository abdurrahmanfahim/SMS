import { describe, expect, it } from "vitest";

import { parseGradeScheme } from "./config.js";
import { BD_GENERAL_GPA5, PRESETS } from "./presets.js";
import type { GradeSchemeConfig } from "./schema.js";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("parseGradeScheme", () => {
  it("accepts the bd-general-gpa5 preset and normalizes it to hundredths", () => {
    const result = parseGradeScheme(PRESETS["bd-general-gpa5"]);
    if (!result.ok || result.value.kind !== "gpa_bands") throw new Error("unexpected");
    const scheme = result.value;
    expect(scheme.bands.map((b) => [b.min, b.grade, b.point])).toEqual([
      [0, "F", 0],
      [3300, "D", 100],
      [4000, "C", 200],
      [5000, "B", 300],
      [6000, "A-", 350],
      [7000, "A", 400],
      [8000, "A+", 500],
    ]);
    expect(scheme.maxPoint).toBe(500);
    expect(scheme.optionalThreshold).toBe(200);
    expect(scheme.pass.minTotalBp).toBe(3300);
    expect(scheme.gradeBands[0]).toEqual({ min: 0, grade: "F" });
    expect(scheme.marksUnit).toBe(1n);
    expect(scheme.mode).toBe("half_up");
  });

  it("fills in defaults for missing policy and rounding", () => {
    const config = clone(BD_GENERAL_GPA5) as Record<string, unknown>;
    delete config.missing;
    delete config.rounding;
    delete config.ranking;
    const result = parseGradeScheme(config);
    if (!result.ok) throw new Error("unexpected");
    expect(result.value.missing).toBe("block");
    expect(result.value.gpaUnit).toBe(1n);
  });

  it("rejects overlapping bands with a clear error", () => {
    const config = clone(BD_GENERAL_GPA5) as { bands: { min: number }[] };
    (config.bands[2] as { min: number }).min = 80;
    const result = parseGradeScheme(config);
    if (result.ok) throw new Error("expected an error");
    expect(result.errors[0]).toMatchObject({ code: "bands_overlap", path: "bands" });
    expect(result.errors[0]?.message).toBe("Two grade bands start at 80.00, so they overlap.");
  });

  it("rejects gapped bands (the lowest band must start at 0)", () => {
    const config = clone(BD_GENERAL_GPA5) as { bands: { min: number }[] };
    config.bands.pop();
    const result = parseGradeScheme(config);
    if (result.ok) throw new Error("expected an error");
    expect(result.errors[0]).toMatchObject({ code: "bands_gap", path: "bands" });
    expect(result.errors[0]?.message).toContain("No grade band covers 0 up to 33.00");
  });

  it("rejects GPA grade bands above the maximum point", () => {
    const config = clone(BD_GENERAL_GPA5) as { gpa: { grade_bands: { min: number }[] } };
    (config.gpa.grade_bands[0] as { min: number }).min = 6;
    const result = parseGradeScheme(config);
    if (result.ok) throw new Error("expected an error");
    expect(result.errors[0]).toMatchObject({ code: "band_out_of_range", path: "gpa.grade_bands" });
  });

  it("reports GPA band overlaps and gaps under the GPA path", () => {
    const config = clone(BD_GENERAL_GPA5) as { gpa: { grade_bands: { min: number }[] } };
    config.gpa.grade_bands = [
      { min: 1, grade: "X" },
      { min: 1, grade: "Y" },
    ] as never;
    const result = parseGradeScheme(config);
    if (result.ok) throw new Error("expected an error");
    expect(result.errors.map((e) => e.code).sort()).toEqual(["bands_gap", "bands_overlap"]);
    expect(result.errors.every((e) => e.path === "gpa.grade_bands")).toBe(true);
  });

  it("returns invalid_config with a path for structural problems", () => {
    const config = clone(BD_GENERAL_GPA5) as unknown as Record<string, unknown>;
    (config.bands as { point: number }[])[0]!.point = 3.456;
    config.surprise = true;
    const result = parseGradeScheme(config);
    if (result.ok) throw new Error("expected an error");
    expect(result.errors.every((e) => e.code === "invalid_config")).toBe(true);
    expect(result.errors.some((e) => e.path === "bands.0.point")).toBe(true);
  });

  it("returns errors instead of throwing for garbage input", () => {
    for (const bad of [null, 5, "x", [], {}]) {
      const result = parseGradeScheme(bad);
      expect(result.ok).toBe(false);
    }
    const noPath = parseGradeScheme(null);
    if (noPath.ok) throw new Error("unexpected");
    expect(noPath.errors[0]?.path).toBe("");
  });

  it("accepts a percentage scheme and sorts its bands", () => {
    const config: GradeSchemeConfig = {
      version: 1,
      kind: "percentage_bands",
      bands: [
        { min: 60, grade: "First" },
        { min: 0, grade: "Third" },
        { min: 45, grade: "Second" },
      ],
      fail: { grade: "Fail" },
      pass: { min_percent_total: 33, groups: [] },
    };
    const result = parseGradeScheme(config);
    if (!result.ok || result.value.kind !== "percentage_bands") throw new Error("unexpected");
    expect(result.value.bands.map((b) => b.grade)).toEqual(["Third", "Second", "First"]);
    expect(result.value.bands[0].point).toBeNull();
  });

  it("checks percentage band problems too", () => {
    const result = parseGradeScheme({
      version: 1,
      kind: "percentage_bands",
      bands: [{ min: 10, grade: "Only" }],
      fail: { grade: "Fail" },
      pass: { min_percent_total: 33, groups: [] },
    });
    if (result.ok) throw new Error("expected an error");
    expect(result.errors[0]?.code).toBe("bands_gap");
  });
});
