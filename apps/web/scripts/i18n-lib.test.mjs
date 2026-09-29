import assert from "node:assert/strict";
import { test } from "node:test";

import { compareLocales, findHardcodedStrings, flatten } from "./i18n-lib.mjs";

test("flatten builds dotted keys and rejects non-strings", () => {
  assert.deepEqual(flatten({ a: { b: "x" }, c: { d: { e: "y" } } }), { "a.b": "x", "c.d.e": "y" });
  assert.throws(() => flatten({ a: 1 }), /must be a string/);
});

test("compareLocales passes for matching languages", () => {
  assert.deepEqual(compareLocales({ "a.b.c": "ক {n}" }, { "a.b.c": "A {n}" }), []);
});

test("compareLocales fails on a key missing in either language", () => {
  const p = compareLocales({ "a.b.c": "ক", "a.b.d": "খ" }, { "a.b.c": "A", "a.b.e": "E" });
  assert.ok(p.includes("missing in en: a.b.d"));
  assert.ok(p.includes("missing in bn: a.b.e"));
});

test("compareLocales flags short keys, empty texts and placeholder mismatch", () => {
  const p = compareLocales(
    { "a.b": "ক", "x.y.z": " ", "p.q.r": "{n}" },
    { "a.b": "A", "x.y.z": "X", "p.q.r": "{m}" },
  );
  assert.ok(p.some((m) => m.startsWith("key must be feature.section.key: a.b")));
  assert.ok(p.some((m) => m.startsWith("empty text in bn: x.y.z")));
  assert.ok(p.some((m) => m.startsWith("placeholder mismatch")));
});

test("findHardcodedStrings catches JSX text and attribute literals", () => {
  const src = `
export function A() {
  return (
    <div>
      <span>Hello</span>
      <button aria-label="Close">x</button>
      <p>{t("a.b.c")}</p>
      <p>বাংলা লেখা</p>
    </div>
  );
}`;
  const texts = findHardcodedStrings(src).map((f) => f.text);
  assert.ok(texts.includes("Hello"));
  assert.ok(texts.includes("Close"));
  assert.ok(texts.includes("বাংলা লেখা"));
});

test("findHardcodedStrings ignores translated text, symbols, comments and marked lines", () => {
  const src = `
const x = a > 1 && b < 2;
const y: Array<string> = [];
export function A() {
  return (
    <div>
      {/* Some comment text */}
      <span aria-hidden="true">⚠ </span>
      <p>{t("a.b.c")}</p>
      <span>Brand</span> {/* i18n-ignore */}
    </div>
  );
}`;
  assert.deepEqual(
    findHardcodedStrings(src).map((f) => f.text),
    [],
  );
});
