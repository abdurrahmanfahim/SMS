import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Each test starts and owns its own server + embedded Postgres (see e2e/fixtures.ts), so
  // there's no shared state to race on -- safe to parallelize, but kept serial for a spike
  // to make failures easy to read.
  fullyParallel: false,
  timeout: 30_000,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
  },
});
