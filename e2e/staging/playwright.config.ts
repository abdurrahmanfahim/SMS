import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke test against the DEPLOYED staging site (M0-P3). No local web server is started.
 * Needed environment (GitHub Actions secrets in CI; see .env.example and docs/runbooks/deploy.md):
 *   STAGING_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_STAGING_{SINGLE,MULTI,OTHER}_{EMAIL,PASSWORD}
 * PW_CHROMIUM_PATH lets a machine without Playwright's own browser use another Chromium.
 */
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.STAGING_URL ?? "http://staging-url-not-set.invalid",
    trace: "on-first-retry",
    ...(executablePath ? { launchOptions: { executablePath, args: ["--no-sandbox"] } } : {}),
  },
  projects: [{ name: "staging", use: { ...devices["Pixel 5"] } }],
});
