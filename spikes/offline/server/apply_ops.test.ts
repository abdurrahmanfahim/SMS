import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { callApplyOps, createSpikeDb, lockAttendanceDay, lockExamComponent } from "./db.js";

import type { OutboxOp } from "../src/types.js";

const INSTITUTION = "00000000-0000-0000-0000-000000000001"; // apply_ops.sql's fixed spike tenant

function attendanceOp(overrides: Partial<OutboxOp> = {}): OutboxOp {
  return {
    opId: crypto.randomUUID(),
    entity: "attendance",
    payload: { studentId: crypto.randomUUID(), date: "2026-09-27", status: "present" },
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: "pending",
    nextRetryAt: new Date().toISOString(),
    ...overrides,
  };
}

function marksOp(overrides: Partial<OutboxOp> = {}): OutboxOp {
  return {
    opId: crypto.randomUUID(),
    entity: "marks",
    payload: { studentId: crypto.randomUUID(), componentId: crypto.randomUUID(), value: 75 },
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: "pending",
    nextRetryAt: new Date().toISOString(),
    ...overrides,
  };
}

let db: PGlite;

beforeEach(async () => {
  db = await createSpikeDb();
});

afterEach(async () => {
  await db.close();
});

describe("apply_ops — applying fresh writes", () => {
  it("applies an attendance op and stores the row", async () => {
    const op = attendanceOp();
    const response = await callApplyOps(db, [op]);
    expect(response.results).toEqual([{ opId: op.opId, status: "applied", duplicate: false }]);

    const rows = await db.query<{ student_id: string; date: Date; status: string }>(
      "select student_id, date, status from attendance",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.student_id).toBe((op.payload as { studentId: string }).studentId);
    expect(rows.rows[0]?.status).toBe("present");
    expect(rows.rows[0]?.date.toISOString().slice(0, 10)).toBe("2026-09-27"); // pglite returns `date` as a JS Date
  });

  it("applies a marks op and writes both marks and marks_audit", async () => {
    const op = marksOp();
    const response = await callApplyOps(db, [op]);
    expect(response.results).toEqual([{ opId: op.opId, status: "applied", duplicate: false }]);

    const marksRows = await db.query("select value from marks");
    expect(marksRows.rows).toEqual([{ value: "75.00" }]);
    const auditRows = await db.query("select value, op_id from marks_audit");
    expect(auditRows.rows).toEqual([{ value: "75.00", op_id: op.opId }]);
  });

  it("rejects an unknown entity", async () => {
    const op = attendanceOp({ entity: "unknown" as never });
    const response = await callApplyOps(db, [op]);
    expect(response.results).toEqual([
      { opId: op.opId, status: "rejected", reason: "unknown_entity", duplicate: false },
    ]);
  });
});

describe("apply_ops — idempotency (duplicate delivery)", () => {
  it("re-delivering the same op_id has one effect and reports duplicate:true", async () => {
    const op = marksOp();
    const first = await callApplyOps(db, [op]);
    const second = await callApplyOps(db, [op]);

    expect(first.results).toEqual([{ opId: op.opId, status: "applied", duplicate: false }]);
    expect(second.results).toEqual([{ opId: op.opId, status: "applied", duplicate: true }]);

    const auditRows = await db.query("select count(*)::int as n from marks_audit");
    expect(auditRows.rows).toEqual([{ n: 1 }]); // not 2 -- the duplicate did not re-apply
  });

  it("a duplicate delivery of a REJECTED op still reports the original rejection", async () => {
    const componentId = crypto.randomUUID();
    await lockExamComponent(db, INSTITUTION, componentId);
    const op = marksOp({ payload: { studentId: crypto.randomUUID(), componentId, value: 10 } });

    const first = await callApplyOps(db, [op]);
    const second = await callApplyOps(db, [op]);

    expect(first.results).toEqual([
      { opId: op.opId, status: "rejected", reason: "exam_locked", duplicate: false },
    ]);
    expect(second.results).toEqual([
      { opId: op.opId, status: "rejected", reason: "exam_locked", duplicate: true },
    ]);
  });
});

describe("apply_ops — locked/finalised rejection", () => {
  it("rejects attendance writes for a finalised day and does not insert a row", async () => {
    const date = "2026-09-20";
    await lockAttendanceDay(db, INSTITUTION, date);
    const op = attendanceOp({ payload: { studentId: crypto.randomUUID(), date, status: "absent" } });

    const response = await callApplyOps(db, [op]);
    expect(response.results).toEqual([
      { opId: op.opId, status: "rejected", reason: "attendance_finalised", duplicate: false },
    ]);
    const rows = await db.query("select count(*)::int as n from attendance");
    expect(rows.rows).toEqual([{ n: 0 }]);
  });

  it("rejects marks writes for a locked exam component and does not insert a row or audit entry", async () => {
    const componentId = crypto.randomUUID();
    await lockExamComponent(db, INSTITUTION, componentId);
    const op = marksOp({ payload: { studentId: crypto.randomUUID(), componentId, value: 90 } });

    const response = await callApplyOps(db, [op]);
    expect(response.results).toEqual([
      { opId: op.opId, status: "rejected", reason: "exam_locked", duplicate: false },
    ]);
    const marksRows = await db.query("select count(*)::int as n from marks");
    const auditRows = await db.query("select count(*)::int as n from marks_audit");
    expect(marksRows.rows).toEqual([{ n: 0 }]);
    expect(auditRows.rows).toEqual([{ n: 0 }]);
  });

  it("does not affect a different, unlocked day or component", async () => {
    await lockAttendanceDay(db, INSTITUTION, "2026-09-20");
    const op = attendanceOp({ payload: { studentId: crypto.randomUUID(), date: "2026-09-21", status: "present" } });
    const response = await callApplyOps(db, [op]);
    expect(response.results).toEqual([{ opId: op.opId, status: "applied", duplicate: false }]);
  });
});

describe("apply_ops — last-write-wins", () => {
  it("a later call for the same (student, date) overwrites the earlier attendance status", async () => {
    const studentId = crypto.randomUUID();
    const first = attendanceOp({ payload: { studentId, date: "2026-09-27", status: "absent" } });
    const second = attendanceOp({ payload: { studentId, date: "2026-09-27", status: "present" } });

    await callApplyOps(db, [first]);
    await callApplyOps(db, [second]);

    const rows = await db.query("select status, op_id from attendance where student_id = $1", [studentId]);
    expect(rows.rows).toEqual([{ status: "present", op_id: second.opId }]);
  });

  it("within a single batch, the later array element wins for the same (component, student)", async () => {
    const studentId = crypto.randomUUID();
    const componentId = crypto.randomUUID();
    const first = marksOp({ payload: { studentId, componentId, value: 60 } });
    const second = marksOp({ payload: { studentId, componentId, value: 88 } });

    await callApplyOps(db, [first, second]);

    const rows = await db.query("select value from marks where student_id = $1", [studentId]);
    expect(rows.rows).toEqual([{ value: "88.00" }]);
    const auditRows = await db.query("select count(*)::int as n from marks_audit where student_id = $1", [
      studentId,
    ]);
    expect(auditRows.rows).toEqual([{ n: 2 }]); // both writes are kept in the audit trail
  });
});

describe("apply_ops — batch size", () => {
  it("applies 200 independent ops in a single call", async () => {
    const ops = Array.from({ length: 200 }, () => attendanceOp());
    const response = await callApplyOps(db, ops);
    expect(response.results).toHaveLength(200);
    expect(response.results.every((r) => r.status === "applied")).toBe(true);

    const rows = await db.query("select count(*)::int as n from attendance");
    expect(rows.rows).toEqual([{ n: 200 }]);
  });
});
