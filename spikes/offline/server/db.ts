import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

import type { ApplyOpsResponse, OutboxOp } from "../src/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const schemaSql = readFileSync(join(here, "..", "db", "schema.sql"), "utf8");
const applyOpsSql = readFileSync(join(here, "..", "db", "apply_ops.sql"), "utf8");

/** Boots a fresh, empty embedded Postgres with the spike's schema and apply_ops() installed. */
export async function createSpikeDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(schemaSql);
  await db.exec(applyOpsSql);
  return db;
}

/** Calls the real apply_ops() SQL function -- the same one the HTTP server calls. */
export async function callApplyOps(db: PGlite, ops: readonly OutboxOp[]): Promise<ApplyOpsResponse> {
  const result = await db.query<{ apply_ops: ApplyOpsResponse }>("select apply_ops($1::jsonb) as apply_ops", [
    JSON.stringify(ops),
  ]);
  const row = result.rows[0];
  if (!row) throw new Error("apply_ops returned no row");
  return row.apply_ops;
}

/** Test/demo helper: locks a given institution+date's attendance (marks it finalised). */
export async function lockAttendanceDay(db: PGlite, institutionId: string, date: string): Promise<void> {
  await db.query("insert into attendance_locks (institution_id, date) values ($1, $2) on conflict do nothing", [
    institutionId,
    date,
  ]);
}

/** Test/demo helper: locks a given institution+exam-component (marks it published/locked). */
export async function lockExamComponent(db: PGlite, institutionId: string, componentId: string): Promise<void> {
  await db.query(
    "insert into exam_locks (institution_id, component_id) values ($1, $2) on conflict do nothing",
    [institutionId, componentId],
  );
}
