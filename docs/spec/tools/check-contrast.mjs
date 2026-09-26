#!/usr/bin/env node
/**
 * Computes real WCAG 2.x contrast ratios for every declared pair in
 * design-tokens.json's `contrastPairs` list, for both the `light` and `dark`
 * theme color sets, and prints a pass/fail table against the thresholds in
 * docs/spec/ux-standard.md §3 ("Text contrast at least 4.5:1 (3:1 for large
 * text); UI parts and icons at least 3:1.").
 *
 * Usage: node docs/spec/tools/check-contrast.mjs
 * Exit code: 0 if every required pair passes its threshold, 1 otherwise.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensPath = path.join(__dirname, "..", "design-tokens.json");
const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));

/** sRGB hex (#rrggbb) -> relative luminance, per WCAG 2.x. */
function relativeLuminance(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (u) => (u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two sRGB hex colors, always >= 1. */
function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveColor(colorSet, tokenPath) {
  const parts = tokenPath.split(".");
  let node = colorSet;
  for (const p of parts) {
    if (node == null || !(p in node)) {
      throw new Error(`Unknown color token: ${tokenPath}`);
    }
    node = node[p];
  }
  if (typeof node !== "string") {
    throw new Error(`Color token ${tokenPath} did not resolve to a hex string`);
  }
  return node;
}

const THRESHOLDS = {
  text: 4.5,
  "text-large": 3.0,
  ui: 3.0,
};

let anyFail = false;
const rows = [];

for (const themeName of ["light", "dark"]) {
  const colorSet = tokens.color[themeName];
  for (const pair of tokens.contrastPairs) {
    const fg = resolveColor(colorSet, pair.fg);
    const bg = resolveColor(colorSet, pair.bg);
    const ratio = contrastRatio(fg, bg);
    const threshold = THRESHOLDS[pair.kind];
    const pass = ratio >= threshold;
    if (pair.required !== false && !pass) anyFail = true;
    rows.push({
      theme: themeName,
      pair: `${pair.fg} on ${pair.bg}`,
      kind: pair.kind,
      ratio: ratio.toFixed(2),
      threshold,
      pass: pair.required === false ? `n/a (${pass ? "pass" : "fail"}, exempt)` : pass ? "PASS" : "FAIL",
    });
  }
}

const colWidths = { theme: 6, pair: 34, kind: 11, ratio: 7, threshold: 10, pass: 20 };
const header = ["theme", "pair", "kind", "ratio", "threshold", "result"];
console.log(header.map((h, i) => h.padEnd(Object.values(colWidths)[i])).join(""));
for (const r of rows) {
  console.log(
    [r.theme, r.pair, r.kind, r.ratio, `>= ${r.threshold}`, r.pass]
      .map((v, i) => String(v).padEnd(Object.values(colWidths)[i]))
      .join(""),
  );
}

const failCount = rows.filter((r) => r.pass === "FAIL").length;
console.log(`\n${rows.length - failCount}/${rows.length} pairs pass (required pairs only).`);

if (anyFail) {
  console.error("\nFAIL: one or more required contrast pairs are below threshold.");
  process.exit(1);
} else {
  console.log("\nAll required contrast pairs pass.");
  process.exit(0);
}
