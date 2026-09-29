// Smoke test for the M1-U3 prototypes: each of the five flows loads from a
// static server and shows its heading, and the offline-mode toggle present
// on every flow page actually flips the offline banner. Run with:
//   npx -y serve prototypes -l 4173 &
//   npx playwright test prototypes/smoke.spec.js
const { test, expect } = require("@playwright/test");

const BASE = process.env.PROTOTYPE_BASE_URL || "http://localhost:4173";

const flows = [
  { path: "/attendance/index.html", heading: "আজকের হাজিরা" },
  { path: "/marks/index.html", heading: "নম্বর এন্ট্রি" },
  { path: "/results/index.html", heading: "ফলাফল পর্যালোচনা" },
  { path: "/students/index.html", heading: "শিক্ষার্থী যোগ করুন" },
  { path: "/guardian/index.html", heading: "আমার সন্তান" },
];

for (const flow of flows) {
  test(`loads ${flow.path} and shows heading`, async ({ page }) => {
    await page.goto(BASE + flow.path);
    await expect(page.locator("h1")).toHaveText(flow.heading);
  });

  test(`${flow.path} offline toggle shows the offline banner`, async ({ page }) => {
    await page.goto(BASE + flow.path);
    const toggle = page.locator("#offline-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator("#offline-banner")).toBeVisible();
  });
}

test("lobby links to all five flows", async ({ page }) => {
  await page.goto(BASE + "/index.html");
  const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  for (const flow of flows) {
    const folder = flow.path.split("/")[1];
    expect(hrefs.some((h) => h.includes(folder + "/index.html"))).toBeTruthy();
  }
});
