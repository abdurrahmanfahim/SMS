import assert from "node:assert/strict";
import { test } from "node:test";

import { BUDGETS, checkBudget, initialAssets } from "./bundle-lib.mjs";

const html = `<!doctype html><head>
<script type="module" crossorigin src="/assets/index-abc.js"></script>
<link rel="modulepreload" crossorigin href="/assets/vendor-def.js">
<link rel="stylesheet" crossorigin href="/assets/index-xyz.css">
<link rel="icon" href="/icons/favicon.svg"></head>`;

test("initialAssets finds scripts, modulepreloads and stylesheets only", () => {
  assert.deepEqual(initialAssets(html), {
    js: ["assets/index-abc.js", "assets/vendor-def.js"],
    css: ["assets/index-xyz.css"],
  });
});

test("checkBudget passes at the limit and fails just over it", () => {
  assert.deepEqual(
    checkBudget({ jsGzip: BUDGETS.initialJsGzip, cssGzip: BUDGETS.initialCssGzip }),
    [],
  );
  const over = checkBudget({
    jsGzip: BUDGETS.initialJsGzip + 1,
    cssGzip: BUDGETS.initialCssGzip + 1,
  });
  assert.equal(over.length, 2);
  assert.match(over[0], /initial JS/);
  assert.match(over[1], /initial CSS/);
});
