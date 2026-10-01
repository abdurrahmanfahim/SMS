#!/usr/bin/env node
// Functional smoke check using jsdom (executes real DOM + the pages' own
// scripts) rather than a rendered browser. This is NOT a substitute for the
// axe-core accessibility pass or a visual/layout check — jsdom does not lay
// out CSS — but it does prove each page's JS runs without throwing, the
// expected elements exist, and the key interactions (offline toggle,
// validation, publish confirm, tab switching) actually work end to end.
// Used because Chromium could not be downloaded in this sandbox (network
// egress does not allow cdn.playwright.dev — see the report).
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import path from "node:path";

const cases = [
  { dir: "attendance", heading: "আজকের হাজিরা" },
  { dir: "marks", heading: "নম্বর এন্ট্রি" },
  { dir: "results", heading: "ফলাফল পর্যালোচনা" },
  { dir: "students", heading: "শিক্ষার্থী যোগ করুন" },
  { dir: "guardian", heading: "আমার সন্তান" },
];

let pass = 0, fail = 0;
function check(cond, label) {
  if (cond) { pass++; console.log("  ✓ " + label); }
  else { fail++; console.log("  ✗ " + label); }
}

for (const c of cases) {
  console.log(c.dir + "/index.html");
  const html = readFileSync(path.join("prototypes", c.dir, "index.html"), "utf8");
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost:4173/" + c.dir + "/index.html" });
  const { window } = dom;
  await new Promise((r) => setTimeout(r, 500)); // let DOMContentLoaded + setTimeout-based renders run
  const doc = window.document;

  // jsdom does not implement <dialog>.showModal()/close() (a known jsdom
  // gap, not a page bug) — polyfill minimally so dialog-opening code paths
  // can run without throwing.
  if (window.HTMLDialogElement && !window.HTMLDialogElement.prototype.showModal) {
    window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  }

  check(doc.querySelector("h1")?.textContent === c.heading, `h1 reads "${c.heading}"`);
  check(!!doc.getElementById("offline-toggle"), "offline toggle button exists");
  check(!!doc.getElementById("toast-region"), "toast region exists");

  // Exercise the offline toggle and confirm the banner responds.
  const toggle = doc.getElementById("offline-toggle");
  const banner = doc.getElementById("offline-banner");
  if (toggle && banner) {
    toggle.dispatchEvent(new window.Event("click", { bubbles: true }));
    check(banner.style.display === "flex", "offline banner shows after toggling offline");
    toggle.dispatchEvent(new window.Event("click", { bubbles: true }));
    check(banner.style.display === "none", "offline banner hides after toggling back online");
  }

  if (c.dir === "marks") {
    // Real focus()/blur() and a kept node reference: the grid must update the
    // cell in place (see marks-typing.test.mjs for the full focus regression).
    const firstInput = doc.querySelector('input[data-idx="0"]');
    firstInput.focus();
    firstInput.value = "150";
    firstInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    firstInput.blur();
    check(doc.querySelector('input[data-idx="0"]') === firstInput, "marks grid keeps the same input node after blur (no re-render)");
    check(firstInput.closest("td").classList.contains("cell-error"), "marks grid rejects a value above full marks (150 > 100)");
    check(firstInput.value === "150", "typed value is kept on validation error, not cleared");
  }

  if (c.dir === "students") {
    doc.getElementById("q-save-next").dispatchEvent(new window.Event("click", { bubbles: true }));
    check(doc.getElementById("q-name-err").style.display === "flex", "quick-add blocks an empty name");
    check(doc.getElementById("q-phone-err").style.display === "flex", "quick-add blocks a missing/invalid phone");
    doc.getElementById("tab-paste").dispatchEvent(new window.Event("click", { bubbles: true }));
    check(doc.getElementById("panel-paste").classList.contains("active"), "paste-list tab switches panels");
    doc.getElementById("file-pick-bad").dispatchEvent(new window.Event("click", { bubbles: true }));
    check(doc.getElementById("file-error").style.display === "flex", "file import shows the missing-header failure path");
  }

  if (c.dir === "results") {
    doc.getElementById("open-publish").dispatchEvent(new window.Event("click", { bubbles: true }));
    check(typeof doc.getElementById("publish-dialog").showModal === "function", "publish dialog element present with showModal");
    check(/এই কাজ পরে বাতিল করা যাবে না/.test(doc.getElementById("pub-body").textContent), "publish confirmation names the consequence (cannot be undone)");
  }

  window.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
