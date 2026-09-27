/**
 * Shared types for the offline-queue spike. These are the client <-> server contract:
 * the same shapes are used by the Dexie outbox (src/outbox.ts), the apply_ops prototype
 * (server/db.ts), and the Playwright harness (harness/app.ts).
 */

export type Entity = "attendance" | "marks";

export interface AttendancePayload {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: "present" | "absent" | "late" | "excused";
}

export interface MarksPayload {
  studentId: string;
  componentId: string;
  value: number;
}

export type Payload = AttendancePayload | MarksPayload;

export type OutboxStatus = "pending" | "syncing" | "synced" | "error";

/** One queued write, as stored in the client's Dexie outbox. */
export interface OutboxOp {
  /** Client-generated UUID. This is the idempotency key the server keys off of. */
  opId: string;
  entity: Entity;
  payload: Payload;
  /** ISO instant the op was created on the client, used to keep sync order stable. */
  createdAt: string;
  /** How many sync attempts have been made (successful or not). Starts at 0. */
  attempts: number;
  status: OutboxStatus;
  /** ISO instant; the op is not eligible for sync() until this time has passed. */
  nextRetryAt: string;
  /** Set when status is "error" -- either a rejection reason or a transient-failure message. */
  lastError?: string;
}

/** What the server sends back for one op. */
export interface ApplyOpResult {
  opId: string;
  status: "applied" | "rejected";
  /** Present when status is "rejected" -- a stable, typed code the UI can map to a message. */
  reason?: "attendance_finalised" | "exam_locked" | "unknown_entity";
  /** True when this op_id had already been applied before this call (duplicate delivery). */
  duplicate: boolean;
}

export interface ApplyOpsResponse {
  results: ApplyOpResult[];
}

/** The window hooks the harness page exposes for Playwright to drive and inspect it. Kept
 * as a single shared type so harness/app.ts and e2e/offline.spec.ts can't drift apart. */
export interface WindowOfflineSpike {
  queueOneAttendance: (status?: AttendancePayload["status"]) => Promise<string>;
  queueManyAttendance: (count: number) => Promise<string[]>;
  triggerSync: () => Promise<void>;
  getSyncSummary: () => Promise<{ synced: number; pending: number; error: number }>;
  enqueueRaw: (op: { opId: string; entity: Entity; payload: Payload }) => Promise<void>;
}
