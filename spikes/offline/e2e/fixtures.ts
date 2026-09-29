import type { PGlite } from "@electric-sql/pglite";
import { test as base } from "@playwright/test";

import { createSpikeDb, lockAttendanceDay, lockExamComponent } from "../server/db.js";
import { startServer } from "../server/index.js";

interface Fixtures {
  serverUrl: string;
  db: PGlite;
}

export const test = base.extend<Fixtures>({
  db: async ({}, use) => {
    const db = await createSpikeDb();
    await use(db);
    await db.close();
  },
  serverUrl: async ({ db }, use) => {
    const { url, close } = await startServer(db);
    await use(url);
    await close();
  },
});

export { expect } from "@playwright/test";
export { lockAttendanceDay, lockExamComponent };

export const SPIKE_INSTITUTION_ID = "00000000-0000-0000-0000-000000000001";
