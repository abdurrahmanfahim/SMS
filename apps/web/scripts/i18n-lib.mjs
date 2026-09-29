// Pure helpers for the i18n key check and the hard-coded string check (no file access here).

/** Flattens `{ a: { b: "x" } }` into `{ "a.b": "x" }`; throws on non-string leaves. */
export function flatten(input, prefix = "") {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(`expected an object${prefix ? ` at "${prefix}"` : ""}`);
  }
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[full] = value;
    else if (typeof value === "object" && value !== null && !Array.isArray(value))
      Object.assign(out, flatten(value, full));
    else throw new Error(`value at "${full}" must be a string or an object`);
  }
  return out;
}

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/**
 * Compares two flat message maps. Returns a list of problems (empty when fine): keys missing in
 * either language, empty texts, placeholder mismatches, and keys that break the
 * `feature.section.key` rule (at least three dotted segments).
 */
export function compareLocales(bn, en) {
  const problems = [];
  for (const key of Object.keys(bn)) if (!(key in en)) problems.push(`missing in en: ${key}`);
  for (const key of Object.keys(en)) if (!(key in bn)) problems.push(`missing in bn: ${key}`);
  for (const [locale, map] of [
    ["bn", bn],
    ["en", en],
  ]) {
    for (const [key, text] of Object.entries(map)) {
      if (key.split(".").length < 3) problems.push(`key must be feature.section.key: ${key}`);
      if (text.trim() === "") problems.push(`empty text in ${locale}: ${key}`);
    }
  }
  for (const key of Object.keys(bn)) {
    if (key in en && placeholders(bn[key]).join() !== placeholders(en[key]).join()) {
      problems.push(`placeholder mismatch between bn and en: ${key}`);
    }
  }
  return problems;
}

const LETTER = /\p{L}/u;
const ATTRS = "aria-label|aria-description|aria-roledescription|title|placeholder|alt|label";

function blankComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

/**
 * Finds user-visible text written directly in JSX: text between tags and string literals in
 * accessible-name attributes. A line containing `i18n-ignore` is skipped.
 * Returns `[{ line, text }]`. Callers do not pass test files.
 */
export function findHardcodedStrings(source) {
  const lines = source.split("\n");
  const clean = blankComments(source);
  const lineOf = (index) => clean.slice(0, index).split("\n").length;
  const ignored = (line) => lines[line - 1]?.includes("i18n-ignore") ?? false;
  const found = [];

  // JSX text: the closing ">" of a tag, plain text, then the next "<".
  const textRe = /(<\/?[A-Za-z][\w.]*(?:\s[^<>]*?)?\/?|<\/[A-Za-z][\w.]*)>([^<>{}=;()`]+)(?=<)/g;
  for (const match of clean.matchAll(textRe)) {
    const raw = match[2] ?? "";
    const text = raw.trim();
    if (text === "" || !LETTER.test(text)) continue;
    const at = (match.index ?? 0) + match[0].length - raw.length + raw.indexOf(text);
    const line = lineOf(at);
    if (!ignored(line)) found.push({ line, text });
  }

  const attrRe = new RegExp(`\\b(?:${ATTRS})="([^"]*)"`, "g");
  for (const match of clean.matchAll(attrRe)) {
    const text = match[1] ?? "";
    if (!LETTER.test(text)) continue;
    const line = lineOf(match.index ?? 0);
    if (!ignored(line)) found.push({ line, text });
  }
  return found.sort((a, b) => a.line - b.line);
}
