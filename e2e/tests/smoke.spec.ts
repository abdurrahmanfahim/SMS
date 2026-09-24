import { expect, test } from "@playwright/test";

test("web app boots and renders the placeholder shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SMS")).toBeVisible();
});
