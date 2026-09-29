import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const dirs = ["../fees/", "../alerts/"].map((d) => fileURLToPath(new URL(d, import.meta.url)));
const sources = dirs.flatMap((dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => ({
      name: `${dir.split("/").at(-2)}/${name}`,
      text: readFileSync(dir + name, "utf8"),
    })),
);

/** Removes comments and string/template literals so only code is scanned. */
function codeOnly(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

describe("no floating-point arithmetic on money in fees/ and alerts/", () => {
  it("scans the fees and alerts source files", () => {
    expect(sources.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        "fees/waivers.ts",
        "fees/invoice.ts",
        "fees/allocation.ts",
        "fees/dues.ts",
        "fees/numbering.ts",
        "alerts/templates.ts",
        "alerts/segments.ts",
        "alerts/quiet-hours.ts",
        "alerts/dedupe.ts",
      ]),
    );
  });

  const banned: [string, RegExp][] = [
    ["decimal number literal", /(?<![\w.])\d+\.\d/],
    ["parseFloat", /\bparseFloat\b/],
    ["toFixed", /\.toFixed\b/],
    [
      "Math.round/floor/ceil/sqrt/pow/random",
      /\bMath\.(round|floor|ceil|sqrt|pow|fround|random)\b/,
    ],
  ];

  for (const [label, pattern] of banned) {
    it(`contains no ${label}`, () => {
      for (const { name, text } of sources) {
        expect(pattern.test(codeOnly(text)), `${name}: ${label}`).toBe(false);
      }
    });
  }
});
