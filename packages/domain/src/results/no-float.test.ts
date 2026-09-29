import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const dir = fileURLToPath(new URL("./", import.meta.url));
const sources = readdirSync(dir)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .filter((name) => name !== "presets.ts") // configuration data (spec §7), never used in arithmetic
  .map((name) => ({ name, text: readFileSync(dir + name, "utf8") }));

/** Removes comments and string/template literals so only code is scanned. */
function codeOnly(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

describe("no floating-point arithmetic on marks (spec §2)", () => {
  it("scans the results engine source files", () => {
    expect(sources.map((s) => s.name)).toEqual(
      expect.arrayContaining(["compute.ts", "config.ts", "fixed.ts", "schema.ts", "snapshot.ts"]),
    );
  });

  const banned: [string, RegExp][] = [
    ["decimal number literal", /(?<![\w.])\d+\.\d/],
    ["parseFloat", /\bparseFloat\b/],
    ["toFixed", /\.toFixed\b/],
    [
      "Math.round/floor/ceil/trunc/sqrt/pow/random",
      /\bMath\.(round|floor|ceil|trunc|sqrt|pow|fround|random)\b/,
    ],
    ["Number(...) of a division", /\bNumber\([^)]*\/[^)]*\)/],
  ];

  for (const [label, pattern] of banned) {
    it(`contains no ${label}`, () => {
      for (const { name, text } of sources) {
        expect(pattern.test(codeOnly(text)), `${name}: ${label}`).toBe(false);
      }
    });
  }

  it("keeps every stored number a safe integer for the preset scheme", async () => {
    const { computeExam, BD_GENERAL_GPA5 } = await import("./index.js");
    const r = computeExam({
      scheme: BD_GENERAL_GPA5,
      subjects: [{ id: "s", components: [{ id: "w", code: "w", full: 3, convert_to: 7 }] }],
      students: [{ id: "x", marks: { s: { w: 100 } } }],
    });
    if (!r.ok) throw new Error("unexpected");
    const entry = r.value.students[0];
    if (entry?.status !== "ok") throw new Error("unexpected");
    for (const value of [
      entry.subjects[0]?.total,
      entry.subjects[0]?.percent_bp,
      entry.totals.gpa,
    ]) {
      expect(Number.isSafeInteger(value)).toBe(true);
    }
  });
});
