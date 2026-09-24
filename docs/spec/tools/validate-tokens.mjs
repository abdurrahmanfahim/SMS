#!/usr/bin/env node
/**
 * Validates design-tokens.json against design-tokens.schema.json.
 * Hand-rolled, dependency-free validator (this repo's "boring tools, small
 * dependency list" preference) — it checks exactly what the schema declares:
 * required top-level keys, required color-set sub-keys for light/dark, hex
 * color patterns, breakpoint patterns, and contrastPairs.kind enum values.
 * It is not a general JSON-Schema engine; if the schema grows real
 * conditionals/refs beyond what this file checks, upgrade to a real
 * validator (e.g. ajv) at that point rather than extending this by hand.
 *
 * Usage: node docs/spec/tools/validate-tokens.mjs
 * Exit code: 0 if valid, 1 otherwise (with every problem printed).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(path.join(__dirname, "..", "design-tokens.json"), "utf8"));
const schema = JSON.parse(readFileSync(path.join(__dirname, "design-tokens.schema.json"), "utf8"));

const errors = [];

function requireKeys(obj, keys, label) {
  for (const k of keys) {
    if (!(k in obj)) errors.push(`${label}: missing required key "${k}"`);
  }
}

// Top-level required keys
requireKeys(tokens, schema.required, "root");

// breakpoints
if (tokens.breakpoints) {
  for (const [k, pattern] of [
    ["sm", /^[0-9]+px$/],
    ["md", /^[0-9]+px$/],
    ["lg", /^[0-9]+px$/],
  ]) {
    const v = tokens.breakpoints[k];
    if (v === undefined) errors.push(`breakpoints: missing "${k}"`);
    else if (!pattern.test(v)) errors.push(`breakpoints.${k}: "${v}" does not match ${pattern}`);
  }
}

// color sets
const colorSetRequired = schema.definitions.colorSet.required;
const hexPattern = new RegExp(schema.definitions.hexColor.pattern);

function checkColorSet(themeName) {
  const set = tokens.color?.[themeName];
  if (!set) {
    errors.push(`color.${themeName}: missing entirely`);
    return;
  }
  requireKeys(set, colorSetRequired, `color.${themeName}`);
  // every leaf value that looks like it should be a hex color must match the pattern
  for (const [group, groupObj] of Object.entries(set)) {
    if (typeof groupObj !== "object" || groupObj === null) continue;
    for (const [key, value] of Object.entries(groupObj)) {
      if (typeof value === "string" && !hexPattern.test(value)) {
        errors.push(`color.${themeName}.${group}.${key}: "${value}" is not a valid #rrggbb hex color`);
      }
    }
  }
}
checkColorSet("light");
checkColorSet("dark");

// contrastPairs
if (Array.isArray(tokens.contrastPairs)) {
  const allowedKinds = new Set(["text", "text-large", "ui"]);
  tokens.contrastPairs.forEach((pair, i) => {
    if (!pair.fg) errors.push(`contrastPairs[${i}]: missing "fg"`);
    if (!pair.bg) errors.push(`contrastPairs[${i}]: missing "bg"`);
    if (!allowedKinds.has(pair.kind)) {
      errors.push(`contrastPairs[${i}].kind: "${pair.kind}" is not one of ${[...allowedKinds].join(", ")}`);
    }
  });
} else {
  errors.push("contrastPairs: missing or not an array");
}

// radius required keys
if (tokens.radius) {
  requireKeys(tokens.radius, ["sm", "md", "lg", "full"], "radius");
}

// elevation required keys
if (tokens.elevation) {
  requireKeys(tokens.elevation, ["light", "dark"], "elevation");
}

// motion.reducedMotion required keys
if (tokens.motion) {
  requireKeys(tokens.motion, ["duration", "easing", "reducedMotion"], "motion");
  if (tokens.motion.reducedMotion) {
    requireKeys(tokens.motion.reducedMotion, ["rule", "policy"], "motion.reducedMotion");
  }
}

if (errors.length > 0) {
  console.error(`INVALID — ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
} else {
  console.log("VALID — design-tokens.json satisfies design-tokens.schema.json.");
  process.exit(0);
}
