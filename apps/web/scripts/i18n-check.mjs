// Fails when a translation key is missing in either language (shell and feature files), when a
// key breaks the feature.section.key rule, or when a component contains hard-coded visible text.
//   node scripts/i18n-check.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { compareLocales, findHardcodedStrings, flatten } from "./i18n-lib.mjs";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(webRoot, "src");
const uiSrc = resolve(webRoot, "../../packages/ui/src");

function walk(dir, out = []) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const exists = (file) => {
  try {
    statSync(file);
    return true;
  } catch {
    return false;
  }
};
const problems = [];

// 1. key parity: shell files plus every features/*/i18n/{bn,en}.json
const bn = {};
const en = {};
const add = (target, file, owner) => {
  for (const [key, text] of Object.entries(flatten(read(file)))) {
    if (key in target) problems.push(`duplicate key ${key} (${owner})`);
    target[key] = text;
  }
};
add(bn, join(src, "shared/i18n/bn.json"), "shell");
add(en, join(src, "shared/i18n/en.json"), "shell");
const featuresDir = join(src, "features");
const featureNames = exists(featuresDir)
  ? readdirSync(featuresDir).filter((n) => statSync(join(featuresDir, n)).isDirectory())
  : [];
for (const name of featureNames) {
  for (const [locale, target] of [
    ["bn", bn],
    ["en", en],
  ]) {
    const file = join(featuresDir, name, "i18n", `${locale}.json`);
    if (exists(file)) add(target, file, `feature ${name}`);
    else if (walk(join(featuresDir, name)).some((f) => f.endsWith("register.ts")))
      problems.push(`feature "${name}" has no i18n/${locale}.json`);
  }
}
problems.push(...compareLocales(bn, en));

// 2. hard-coded visible text in components (tests are not scanned)
// src/App.tsx is the unused M0-P1 placeholder (outside this task's owned paths, still covered by
// App.test.tsx); it is excluded by name and listed under Requests in docs/reports/M0-W1.md.
const LEGACY = new Set([join(src, "App.tsx")]);
const components = [...walk(src), ...walk(uiSrc)].filter(
  (f) => f.endsWith(".tsx") && !/\.test\.tsx$/.test(f) && !LEGACY.has(f),
);
for (const file of components) {
  for (const { line, text } of findHardcodedStrings(readFileSync(file, "utf8"))) {
    problems.push(`hard-coded text ${relative(webRoot, file)}:${line}: ${JSON.stringify(text)}`);
  }
}

if (problems.length > 0) {
  process.stderr.write(
    `i18n check failed (${problems.length}):\n${problems.map((p) => `  - ${p}`).join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `i18n check passed: ${Object.keys(bn).length} keys in bn and en, ${components.length} components scanned\n`,
);
