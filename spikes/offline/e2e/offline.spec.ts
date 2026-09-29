import { expect, lockAttendanceDay, SPIKE_INSTITUTION_ID, test } from "./fixtures.js";

import type { WindowOfflineSpike } from "../src/types.js";

declare global {
  interface Window {
    offlineSpike: WindowOfflineSpike;
  }
}

test("200 offline ops sync correctly after reconnect", async ({ page, serverUrl }) => {
  await page.goto(serverUrl);
  await page.context().setOffline(true);

  await page.evaluate(() => window.offlineSpike.queueManyAttendance(200));
  await expect.poll(() => page.evaluate(() => window.offlineSpike.getSyncSummary())).toEqual({
    synced: 0,
    pending: 200,
    error: 0,
  });

  await page.context().setOffline(false);
  await page.evaluate(() => window.offlineSpike.triggerSync());

  await expect(page.locator("#status")).toHaveText("Synced");
  const summary = await page.evaluate(() => window.offlineSpike.getSyncSummary());
  expect(summary).toEqual({ synced: 200, pending: 0, error: 0 });

  const state = (await page.request.get(`${serverUrl}/admin/state`).then((r) => r.json())) as {
    attendance: number;
  };
  expect(state.attendance).toBe(200); // the server really has all 200 rows, not just a client-side claim
});

test("duplicate delivery over the real HTTP round-trip has one effect", async ({ page, serverUrl }) => {
  await page.goto(serverUrl);
  const opId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const body = JSON.stringify({
    ops: [{ opId, entity: "attendance", payload: { studentId, date: "2026-09-27", status: "present" } }],
  });

  const sendOnce = () =>
    page.evaluate(
      ({ url, body }) =>
        fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body }).then((r) => r.json()),
      { url: "/apply_ops", body },
    );

  const first = (await sendOnce()) as { results: { status: string; duplicate: boolean }[] };
  const second = (await sendOnce()) as { results: { status: string; duplicate: boolean }[] };

  expect(first.results[0]).toMatchObject({ status: "applied", duplicate: false });
  expect(second.results[0]).toMatchObject({ status: "applied", duplicate: true });

  const state = (await page.request.get(`${serverUrl}/admin/state`).then((r) => r.json())) as {
    attendance: number;
  };
  expect(state.attendance).toBe(1); // the duplicate did not insert a second row
});

test("a write to a finalised attendance day is rejected and shown as an error in the UI", async ({
  page,
  serverUrl,
  db,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  await lockAttendanceDay(db, SPIKE_INSTITUTION_ID, today);

  await page.goto(serverUrl);
  await page.evaluate(() => window.offlineSpike.queueOneAttendance());
  await page.evaluate(() => window.offlineSpike.triggerSync());

  await expect(page.locator("#status")).toHaveText("Error (1)");
  await expect(page.locator("#errors li")).toContainText("attendance_finalised");
  // the status is never colour-only -- the accessible name/text always states it plainly
  await expect(page.locator("#status")).toHaveAttribute("role", "status");
  await expect(page.locator("#errors button[data-retry-for]")).toBeVisible();
});

test("the queue survives a page reload (persisted in IndexedDB, not just in-memory state)", async ({
  page,
  serverUrl,
}) => {
  await page.goto(serverUrl);
  await page.context().setOffline(true);
  await page.evaluate(() => window.offlineSpike.queueOneAttendance());
  await expect(page.locator("#status")).toHaveText("Pending 1");

  // Reconnect only so the reload's own navigation can succeed -- a literal reload while
  // still offline would fail to load the page at all (this spike has no service worker
  // caching the app shell; that is a separate concern from queueing writes). What this
  // test actually checks is that the op was persisted to IndexedDB, not held in memory
  // that a reload would wipe -- so we deliberately check the summary BEFORE triggering
  // any sync, right after the reload.
  await page.context().setOffline(false);
  await page.reload();

  // Note: reconnecting just before reload fires a real browser 'online' event, which the
  // harness uses to auto-trigger a sync -- so the reload can interrupt that in-flight sync,
  // leaving the op "syncing" rather than "pending". sync()'s own recovery of stuck ops
  // (src/outbox.test.ts) handles this, which is exactly what the next triggerSync() call
  // below is also proving, alongside the persistence this test is named for.
  const summaryAfterReload = await page.evaluate(() => window.offlineSpike.getSyncSummary());
  expect(summaryAfterReload.synced).toBe(0);
  expect(summaryAfterReload.error).toBe(0);
  expect(summaryAfterReload.pending).toBe(1);

  await page.evaluate(() => window.offlineSpike.triggerSync());
  await expect(page.locator("#status")).toHaveText("Synced");
});
