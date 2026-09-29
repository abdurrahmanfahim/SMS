#!/usr/bin/env node
// Checks that every interactive control rule in shared/tokens.css declares
// at least a 44px minimum height, per ux-standard.md §4 ("Minimum control
// size 44×44 CSS px"). This is a static CSS-rule check (not a rendered
// layout measurement — see the report's "Known issues" for why a full,
// rendered axe/Playwright pass could not be run in this environment).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(dir, "shared/tokens.css"), "utf8");

const interactiveSelectors = [
  "button, .btn",
  "input[type=\"text\"], input[type=\"tel\"], input[type=\"number\"], textarea, select",
  ".bottom-nav a",
  ".app-header .back",
  ".help-link",
];
// Note: the attendance page's 4-way status toggle (.seg button, defined in
// attendance/index.html, not the shared tokens.css) is a known exception —
// see the report's "Known issues": four 44px-wide targets do not fit next
// to a name column on a 360px phone, so those buttons are 44px tall but
// narrower than 44px wide. Flagged for the Leader, not silently fixed here.

let failures = [];
for (const sel of interactiveSelectors) {
  const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}");
  const m = css.match(re);
  if (!m) {
    failures.push(`Selector not found in tokens.css: ${sel}`);
    continue;
  }
  const block = m[1];
  const heightMatch = block.match(/min-height:\s*(\d+)px/);
  if (!heightMatch || Number(heightMatch[1]) < 44) {
    failures.push(`${sel} does not declare min-height >= 44px`);
  }
}

if (failures.length) {
  console.log("FAIL — touch target check");
  failures.forEach((f) => console.log("  - " + f));
  process.exit(1);
} else {
  console.log(`PASS — all ${interactiveSelectors.length} shared interactive selectors declare min-height >= 44px`);
  process.exit(0);
}
