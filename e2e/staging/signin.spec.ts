import { expect, test, type Page } from "@playwright/test";

import { account, type Account } from "./env";

/** Institution names come from the seed script (scripts/seed-staging-lib.mjs). */
const SCHOOL = /আদর্শ স্কুল|Adarsha School/;
const MADRASA = /নূরানী মাদ্রাসা|Nurani Madrasa/;

async function signIn(page: Page, who: Account) {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/ইমেইল|Email/).fill(who.email);
  await page.getByLabel(/পাসওয়ার্ড|Password/).fill(who.password);
  await page.getByRole("button", { name: /সাইন ইন করুন|Sign in/ }).click();
}

test.describe("walking skeleton on staging", () => {
  test("a single-institution user signs in and sees the institution name", async ({ page }) => {
    await signIn(page, account("SINGLE"));
    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await expect(page.getByTestId("page-dashboard")).toBeVisible();
    await expect(page.getByTestId("institution-name")).toHaveText(SCHOOL);
  });

  test("the session survives a reload, and sign-out ends it", async ({ page }) => {
    await signIn(page, account("SINGLE"));
    await expect(page.getByTestId("institution-name")).toHaveText(SCHOOL);
    await page.reload();
    await expect(page.getByTestId("institution-name")).toHaveText(SCHOOL);
    await page.getByRole("button", { name: /সাইন আউট|Sign out/ }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
  });

  test("a wrong password is refused", async ({ page }) => {
    await signIn(page, { ...account("SINGLE"), password: "definitely-not-the-password" });
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
  });

  test("the two-institution user gets the picker and can reach both dashboards", async ({ page }) => {
    await signIn(page, account("MULTI"));
    await expect(page).toHaveURL(/\/auth\/pick-institution$/);
    await page.getByRole("button", { name: SCHOOL }).click();
    await expect(page.getByTestId("institution-name")).toHaveText(SCHOOL);
    await page.getByRole("button", { name: /প্রতিষ্ঠান বদলান|Switch institution/ }).click();
    await expect(page).toHaveURL(/\/auth\/pick-institution$/);
    await page.getByRole("button", { name: MADRASA }).click();
    await expect(page.getByTestId("institution-name")).toHaveText(MADRASA);
  });
});
