import { defineConfig, devices } from "@playwright/test";

/**
 * Web shell tests (M0-W1). The app is built with dev tools switched on (`/dev/kit`, `/dev/form`,
 * role switcher) and served by `vite preview` so the service worker and manifest are real.
 * PW_CHROMIUM_PATH lets a machine without Playwright's own browser use another Chromium.
 */
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry",
    ...(executablePath ? { launchOptions: { executablePath, args: ["--no-sandbox"] } } : {}),
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /perf.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Timing tests run alone, after everything else has finished, so they do not compete for CPU.
      name: "perf",
      testMatch: /perf.*\.spec\.ts/,
      dependencies: ["chromium"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "pnpm --filter @sms/web build && cd ../../apps/web && exec ./node_modules/.bin/vite preview --host 127.0.0.1 --port 4174 --strictPort",
    env: { VITE_ENABLE_DEV_TOOLS: "true" },
    url: "http://127.0.0.1:4174",
    // never reuse: a leftover server could serve a build without the dev tools this suite needs
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
