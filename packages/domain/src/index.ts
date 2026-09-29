/**
 * `@sms/domain` — the pure utility layer every other domain module and the UI build on: money,
 * calendar dates, Bangladeshi phone numbers, digit scripts, names, ids, and the zod schemas that
 * tie them to form and API validation.
 *
 * The only runtime dependency is `zod`. Every function here is pure — no I/O, no globals, no clock
 * or randomness unless passed in as a parameter — and every validator for user-typed input returns
 * a discriminated union (`{ ok: true, ... } | { ok: false, reason }`) rather than throwing.
 *
 * Result, grading, ranking and fee logic are out of scope for this package (see `M2-D1`, `M2-D2`
 * and the `M3-*` tasks) — this is only the foundation those build on.
 */

export * from "./money.js";
export * from "./dates.js";
export * from "./phone.js";
export * from "./digits.js";
export * from "./names.js";
export * from "./ids.js";
export * from "./schemas.js";
export * from "./results/index.js";
