#!/usr/bin/env node
// Regression test for M1-U3b: on a real phone the marks grid let you type in
// one cell and then "stuck" — tapping any other cell snapped focus back,
// because blur re-rendered the whole grid (destroying the cell just tapped).
// The old jsdom smoke test missed it because it re-queried the DOM after the
// blur, hiding the replaced nodes. This test keeps node references and uses
// real focus()/blur() so that bug cannot come back unnoticed.
//
// Still jsdom: it proves focus/typing LOGIC, not layout. The Owner phone
// checklist (docs/research/owner-phone-checklist.md) covers the real device.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (cond, label) => { cond ? pass++ : fail++; console.log((cond ? "  ✓ " : "  ✗ ") + label); };

const html = readFileSync("prototypes/marks/index.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost:4173/marks/index.html", pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;
await new Promise((r) => setTimeout(r, 500));
if (!window.HTMLElement.prototype.scrollIntoView) window.HTMLElement.prototype.scrollIntoView = () => {};

const cell = (i) => doc.querySelector(`input[data-idx="${i}"]`);
const type = (el, text) => {
  el.focus();
  let v = "";
  for (const ch of text) { v += ch; el.value = v; el.dispatchEvent(new window.Event("input", { bubbles: true })); }
};
const before = [...doc.querySelectorAll("input.mark-input")];

console.log("marks typing (focus must never be stolen, nodes never replaced)");
check(before.length === 40, "grid has 40 input cells");
check(before.every((i) => i.getAttribute("inputmode") === "numeric"), "every cell requests the numeric keypad");

type(cell(0), "75");
cell(1).focus();                                   // person taps the next cell
check(doc.activeElement === cell(1), "tapping cell 2 after typing in cell 1 moves focus to cell 2 (not snapped back)");
type(cell(1), "88");
cell(4).focus();
check(doc.activeElement === cell(4), "can jump from cell 2 to cell 5");
type(cell(4), "100");
check(cell(0).value === "75" && cell(1).value === "88" && cell(4).value === "100", "multi-digit values stay in every cell");

cell(2).focus();
cell(2).dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
check(doc.activeElement === cell(3), "Enter / keyboard 'next' on an empty cell moves to the next cell");

type(cell(5), "150");
cell(6).focus();
check(doc.activeElement === cell(6), "after a bad value (150) focus still moves on when the person taps elsewhere");
check(cell(5).closest("td").classList.contains("cell-error") && cell(5).value === "150", "bad value is flagged and kept, not cleared");
check(!cell(5).closest("td").querySelector(".cell-note").hidden, "error message is shown");
type(cell(5), "50");
cell(7).focus();
check(!cell(5).closest("td").classList.contains("cell-error"), "fixing the value clears the error");

// absent button (the numeric keypad has no Bangla letter)
const absBtn = doc.querySelector('.absent-btn[data-id="s9"]');
absBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
check(absBtn.getAttribute("aria-pressed") === "true" && cell(8).placeholder === "অনুপস্থিত", "অ button marks a student absent");
const counter = doc.getElementById("entered-counter").textContent;
check(/৫ জনের নম্বর/.test(counter), `counter counts saved + absent cells (got: ${counter})`);
absBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
check(absBtn.getAttribute("aria-pressed") === "false", "tapping অ again clears absent");

const after = [...doc.querySelectorAll("input.mark-input")];
check(after.length === before.length && after.every((n, i) => n === before[i]), "no input node was replaced during the whole session");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
