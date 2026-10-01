// Pure helpers for the bundle budget check.

/** Budgets in bytes (gzip). Keep in sync with docs/decisions/0005-performance-budget.md. */
export const BUDGETS = {
  initialJsGzip: 200 * 1024,
  initialCssGzip: 40 * 1024,
};

/**
 * Lists the files the browser must load for the first screen: module scripts, modulepreloads and
 * stylesheets referenced by index.html. Lazy chunks and fonts are not part of "initial".
 * Returns `{ js: string[], css: string[] }` of paths relative to the dist root.
 */
export function initialAssets(html) {
  const js = new Set();
  const css = new Set();
  const clean = (href) => href.replace(/^\//, "").replace(/^\.\//, "");
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*>/g)) js.add(clean(m[1]));
  for (const m of html.matchAll(
    /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+\.js)"[^>]*>/g,
  ))
    js.add(clean(m[1]));
  for (const m of html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+\.css)"[^>]*>/g))
    css.add(clean(m[1]));
  return { js: [...js], css: [...css] };
}

/** Returns a list of human-readable budget violations (empty when within budget). */
export function checkBudget(sizes, budgets = BUDGETS) {
  const problems = [];
  if (sizes.jsGzip > budgets.initialJsGzip)
    problems.push(`initial JS ${kb(sizes.jsGzip)} gzip exceeds ${kb(budgets.initialJsGzip)}`);
  if (sizes.cssGzip > budgets.initialCssGzip)
    problems.push(`initial CSS ${kb(sizes.cssGzip)} gzip exceeds ${kb(budgets.initialCssGzip)}`);
  return problems;
}

export const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
