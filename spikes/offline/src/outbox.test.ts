import "fake-indexeddb/auto";

import fc from "fast-check";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { enqueue, getSyncSummary, manualRetry, nextRetryDelayMs, sync, OutboxDatabase } from "./outbox.js";

import type { ApplyOpResult, OutboxOp } from "./types.js";

let db: OutboxDatabase;
let dbCounter = 0;

beforeEach(() => {
  // A fresh database name per test avoids cross-test bleed (fake-indexeddb keeps databases
  // in memory for the process lifetime, not per-test).
  dbCounter += 1;
  db = new OutboxDatabase(`test-outbox-${dbCounter}`);
});

function attendancePayload() {
  return { studentId: crypto.randomUUID(), date: "2026-09-27", status: "present" as const };
}

describe("enqueue / getSyncSummary", () => {
  it("a freshly enqueued op is pending", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    expect(await getSyncSummary(db)).toEqual({ synced: 0, pending: 1, error: 0 });
  });

  it("counts synced, pending, and error ops separately", async () => {
    await enqueue(db, { opId: crypto.randomUUID(), entity: "attendance", payload: attendancePayload() });
    const applyOps = async (ops: readonly OutboxOp[]): Promise<readonly ApplyOpResult[]> =>
      ops.map((op) => ({ opId: op.opId, status: "applied" as const, duplicate: false }));
    await sync(db, applyOps);
    await enqueue(db, { opId: crypto.randomUUID(), entity: "attendance", payload: attendancePayload() });

    expect(await getSyncSummary(db)).toEqual({ synced: 1, pending: 1, error: 0 });
  });
});

describe("sync — success", () => {
  it("marks an applied op as synced", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });

    const applyOps = vi.fn(
      async (ops: readonly OutboxOp[]): Promise<readonly ApplyOpResult[]> =>
        ops.map((op) => ({ opId: op.opId, status: "applied" as const, duplicate: false })),
    );
    await sync(db, applyOps);

    const stored = await db.outbox.get(opId);
    expect(stored?.status).toBe("synced");
    expect(applyOps).toHaveBeenCalledTimes(1);
  });

  it("treats a duplicate response the same as applied", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    await sync(db, async (ops) => ops.map((op) => ({ opId: op.opId, status: "applied", duplicate: true })));
    expect((await db.outbox.get(opId))?.status).toBe("synced");
  });

  it("sends more than one batch when there are more ops than batchSize", async () => {
    for (let i = 0; i < 5; i += 1) {
      await enqueue(db, { opId: crypto.randomUUID(), entity: "attendance", payload: attendancePayload() });
    }
    const batchSizes: number[] = [];
    const applyOps = async (ops: readonly OutboxOp[]): Promise<readonly ApplyOpResult[]> => {
      batchSizes.push(ops.length);
      return ops.map((op) => ({ opId: op.opId, status: "applied" as const, duplicate: false }));
    };
    await sync(db, applyOps, { batchSize: 2 });

    expect(batchSizes).toEqual([2, 2, 1]);
    expect((await getSyncSummary(db)).synced).toBe(5);
  });

  it("does nothing when the outbox is empty", async () => {
    const applyOps = vi.fn(async () => []);
    await sync(db, applyOps);
    expect(applyOps).not.toHaveBeenCalled();
  });
});

describe("sync — rejected (terminal, not retried)", () => {
  it("moves a rejected op straight to error with the server's reason", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    await sync(db, async (ops) =>
      ops.map((op) => ({ opId: op.opId, status: "rejected" as const, reason: "attendance_finalised" as const, duplicate: false })),
    );

    const stored = await db.outbox.get(opId);
    expect(stored?.status).toBe("error");
    expect(stored?.lastError).toBe("attendance_finalised");
    expect(stored?.attempts).toBe(0); // rejection is not a retry-counted attempt
  });

  it("does not retry a rejected op on a later sync() call", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    const applyOps = vi.fn(async (ops: readonly OutboxOp[]) =>
      ops.map((op) => ({ opId: op.opId, status: "rejected" as const, reason: "exam_locked" as const, duplicate: false })),
    );
    await sync(db, applyOps);
    await sync(db, applyOps); // error status is not "pending", so this should find nothing to send

    expect(applyOps).toHaveBeenCalledTimes(1);
  });
});

describe("sync — transient failure, retry with backoff", () => {
  it("bumps attempts and schedules a future retry on a network error", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    const fixedNow = Date.now();

    await sync(
      db,
      async () => {
        throw new Error("offline");
      },
      { now: () => fixedNow, backoffBaseMs: 1000 },
    );

    const stored = await db.outbox.get(opId);
    expect(stored?.status).toBe("pending");
    expect(stored?.attempts).toBe(1);
    expect(stored?.lastError).toBe("offline");
    expect(Date.parse(stored!.nextRetryAt) - fixedNow).toBe(nextRetryDelayMs(1, 1000));
  });

  it("does not re-send an op whose backoff has not elapsed yet", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    const fixedNow = Date.now();
    const failingApplyOps = async (): Promise<never> => {
      throw new Error("offline");
    };
    await sync(db, failingApplyOps, { now: () => fixedNow, backoffBaseMs: 1000 });

    const secondApplyOps = vi.fn(async (ops: readonly OutboxOp[]) =>
      ops.map((op) => ({ opId: op.opId, status: "applied" as const, duplicate: false })),
    );
    // one millisecond before nextRetryAt -- should still be skipped
    await sync(db, secondApplyOps, { now: () => fixedNow + nextRetryDelayMs(1, 1000) - 1 });
    expect(secondApplyOps).not.toHaveBeenCalled();

    // exactly at nextRetryAt -- now eligible
    await sync(db, secondApplyOps, { now: () => fixedNow + nextRetryDelayMs(1, 1000) });
    expect(secondApplyOps).toHaveBeenCalledTimes(1);
    expect((await db.outbox.get(opId))?.status).toBe("synced");
  });

  it("moves to error after maxAttempts consecutive transient failures", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    let clock = Date.now();
    const failingApplyOps = async (): Promise<never> => {
      throw new Error("offline");
    };

    for (let i = 0; i < 3; i += 1) {
      await sync(db, failingApplyOps, { now: () => clock, maxAttempts: 3, backoffBaseMs: 1 });
      clock += 10_000; // fast-forward well past any backoff window between attempts
    }

    const stored = await db.outbox.get(opId);
    expect(stored?.status).toBe("error");
    expect(stored?.attempts).toBe(3);
    expect(stored?.lastError).toBe("offline");
  });
});

describe("sync — recovering an interrupted sync (stuck in 'syncing')", () => {
  it("retries a stuck op immediately, without applying backoff", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    // Simulate an app close/reload mid-request: the op was marked "syncing" but nothing
    // ever resolved it (the promise that would have was abandoned, not rejected).
    await db.outbox.update(opId, { status: "syncing" });

    const applyOps = vi.fn(async (ops: readonly OutboxOp[]) =>
      ops.map((op) => ({ opId: op.opId, status: "applied" as const, duplicate: false })),
    );
    await sync(db, applyOps); // one call: recovers AND syncs, no backoff wait needed

    expect(applyOps).toHaveBeenCalledTimes(1);
    expect((await db.outbox.get(opId))?.status).toBe("synced");
  });

  it("moves a repeatedly-stuck op to error once maxAttempts is reached, instead of retrying forever", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    await db.outbox.update(opId, { status: "syncing", attempts: 2 });

    // applyOps is never actually called here: recovery itself moves a stuck op straight to
    // "error" once attempts would reach maxAttempts, without spending another attempt.
    const applyOps = vi.fn(async (): Promise<never> => {
      throw new Error("should not be called");
    });
    await sync(db, applyOps, { maxAttempts: 3 });

    expect(applyOps).not.toHaveBeenCalled();
    const stored = await db.outbox.get(opId);
    expect(stored?.status).toBe("error");
    expect(stored?.attempts).toBe(3);
    expect(stored?.lastError).toBe("interrupted");
  });
});

describe("manualRetry", () => {
  it("resets an errored op back to pending so the next sync() call tries it again", async () => {
    const opId = crypto.randomUUID();
    await enqueue(db, { opId, entity: "attendance", payload: attendancePayload() });
    await sync(db, async (ops) =>
      ops.map((op) => ({ opId: op.opId, status: "rejected" as const, reason: "attendance_finalised" as const, duplicate: false })),
    );
    expect((await db.outbox.get(opId))?.status).toBe("error");

    await manualRetry(db, opId);
    const reset = await db.outbox.get(opId);
    expect(reset?.status).toBe("pending");
    expect(reset?.attempts).toBe(0);
    expect(reset?.lastError).toBeUndefined();

    await sync(db, async (ops) => ops.map((op) => ({ opId: op.opId, status: "applied" as const, duplicate: false })));
    expect((await db.outbox.get(opId))?.status).toBe("synced");
  });
});

describe("nextRetryDelayMs (property)", () => {
  it("never exceeds maxMs and is non-decreasing in attempts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 5000, max: 120_000 }),
        (attempts, baseMs, maxMs) => {
          const delay = nextRetryDelayMs(attempts, baseMs, maxMs);
          expect(delay).toBeLessThanOrEqual(maxMs);
          expect(delay).toBeGreaterThanOrEqual(Math.min(baseMs, maxMs));
          if (attempts > 0) {
            expect(delay).toBeGreaterThanOrEqual(nextRetryDelayMs(attempts - 1, baseMs, maxMs));
          }
        },
      ),
    );
  });
});
