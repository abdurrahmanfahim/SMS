// Fails the build when the initial JS or CSS of the shell route is over budget (gzip).
// Runs at the end of `pnpm --filter @sms/web build`, so CI's `pnpm build` enforces it.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { BUDGETS, checkBudget, initialAssets, kb } from "./bundle-lib.mjs";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const html = readFileSync(join(dist, "index.html"), "utf8");
const assets = initialAssets(html);
const gzipOf = (files) =>
  files.reduce((sum, f) => sum + gzipSync(readFileSync(join(dist, f)), { level: 9 }).length, 0);

const sizes = { jsGzip: gzipOf(assets.js), cssGzip: gzipOf(assets.css) };
process.stdout.write(
  `bundle budget: initial JS ${kb(sizes.jsGzip)} / ${kb(BUDGETS.initialJsGzip)} gzip (${assets.js.length} file(s)), ` +
    `initial CSS ${kb(sizes.cssGzip)} / ${kb(BUDGETS.initialCssGzip)} gzip (${assets.css.length} file(s))\n`,
);
const problems = checkBudget(sizes);
if (problems.length > 0) {
  process.stderr.write(`bundle budget FAILED:\n${problems.map((p) => `  - ${p}`).join("\n")}\n`);
  process.exit(1);
}
