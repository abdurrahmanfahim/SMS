import { enqueue, getSyncSummary, manualRetry, sync, OutboxDatabase } from "../src/outbox.js";

import type { ApplyOpResult, AttendancePayload, OutboxOp, WindowOfflineSpike } from "../src/types.js";

const db = new OutboxDatabase("harness-outbox");

async function applyOps(ops: readonly OutboxOp[]): Promise<readonly ApplyOpResult[]> {
  const response = await fetch("/apply_ops", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ops }),
  });
  if (!response.ok) throw new Error(`apply_ops http ${response.status}`);
  const body = (await response.json()) as { results: ApplyOpResult[] };
  return body.results;
}

async function triggerSync(): Promise<void> {
  await sync(db, applyOps);
  await render();
}

async function render(): Promise<void> {
  const summary = await getSyncSummary(db);
  const statusEl = document.getElementById("status");
  if (statusEl) {
    if (summary.error > 0) {
      statusEl.textContent = `Error (${summary.error})`;
      statusEl.dataset.state = "error";
    } else if (summary.pending > 0) {
      statusEl.textContent = `Pending ${summary.pending}`;
      statusEl.dataset.state = "pending";
    } else {
      statusEl.textContent = "Synced";
      statusEl.dataset.state = "synced";
    }
  }

  const errorsEl = document.getElementById("errors");
  if (errorsEl) {
    const errored = await db.outbox.where("status").equals("error").toArray();
    errorsEl.innerHTML = "";
    for (const op of errored) {
      const li = document.createElement("li");
      li.textContent = `${op.entity} ${op.opId.slice(0, 8)} — ${op.lastError ?? "error"} `;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Retry";
      button.dataset.retryFor = op.opId;
      button.addEventListener("click", () => {
        void manualRetry(db, op.opId).then(triggerSync);
      });
      li.append(button);
      errorsEl.append(li);
    }
  }
}

async function enqueueOneAttendance(status: AttendancePayload["status"] = "present"): Promise<string> {
  const opId = crypto.randomUUID();
  await enqueue(db, {
    opId,
    entity: "attendance",
    payload: { studentId: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), status },
  });
  return opId;
}

async function queueOneAttendance(status?: AttendancePayload["status"]): Promise<string> {
  const opId = await enqueueOneAttendance(status);
  await render();
  return opId;
}

async function queueManyAttendance(count: number): Promise<string[]> {
  // Simulates count separate offline taps (each its own op/opId), but renders once at the
  // end rather than after every single one -- this is a bulk test helper standing in for
  // many individual user actions, not a bulk "import" feature the product itself needs.
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    ids.push(await enqueueOneAttendance());
  }
  await render();
  return ids;
}

document.getElementById("enqueue-one")?.addEventListener("click", () => void queueOneAttendance());
document.getElementById("enqueue-many")?.addEventListener("click", () => void queueManyAttendance(200));
document.getElementById("sync-now")?.addEventListener("click", () => void triggerSync());

window.addEventListener("online", () => void triggerSync());

// Hooks for the Playwright tests to drive the page deterministically and read its state
// back out, beyond what's visible in the rendered DOM.
declare global {
  interface Window {
    offlineSpike: WindowOfflineSpike;
  }
}

window.offlineSpike = {
  queueOneAttendance,
  queueManyAttendance,
  triggerSync,
  getSyncSummary: () => getSyncSummary(db),
  enqueueRaw: (op) => enqueue(db, op),
};

void render();
