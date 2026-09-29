import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/app", "/install", "/dev/kit", "/dev/form"] as const;
const PHONE = { width: 360, height: 740 };
const DESKTOP = { width: 1280, height: 800 };

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function axeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

test.describe("layout at phone and desktop widths", () => {
  for (const [name, size] of [
    ["phone 360", PHONE],
    ["small phone 320", { width: 320, height: 640 }],
    ["desktop 1280", DESKTOP],
  ] as const) {
    test(`no horizontal scroll: ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.getByRole("banner")).toBeVisible();
        await noHorizontalScroll(page);
      }
    });
  }

  test("phone shows the bottom tab bar, desktop shows the sidebar", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/app");
    const navs = page.getByRole("navigation", { name: "প্রধান মেনু" });
    await expect(navs.filter({ visible: true })).toHaveCount(1);
    const box = await navs.filter({ visible: true }).boundingBox();
    expect(box && box.y + box.height).toBeCloseTo(PHONE.height, 0);

    await page.setViewportSize(DESKTOP);
    const sidebar = await navs.filter({ visible: true }).boundingBox();
    expect(sidebar?.width).toBe(240);
  });

  test("touch targets are at least 44px on the phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    for (const path of ["/app", "/dev/form", "/dev/kit"]) {
      await page.goto(path);
      const small = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll("button, a[href], input, select")) {
          const r = el.getBoundingClientRect();
          if (r.width <= 1 || r.height <= 1) continue; // visually hidden (skip link)
          if (el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)) continue;
          if (r.height < 43.5 || r.width < 43.5) {
            out.push(
              `${el.tagName} "${(el.textContent ?? "").trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
            );
          }
        }
        return out;
      });
      expect(small, path).toEqual([]);
    }
  });
});

test.describe("keyboard and language", () => {
  test("skip link is the first Tab stop and moves focus to main", async ({ page }) => {
    await page.goto("/app");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "মূল অংশে যান" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("Bangla is the default and the language choice survives a reload", async ({ page }) => {
    await page.goto("/app");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "Help" })).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "Help" })).toBeVisible();
  });

  test("Help is the last header control on every route group", async ({ page }) => {
    for (const path of ["/app", "/platform", "/parent", "/auth/login"]) {
      await page.goto(path);
      const last = page.getByRole("banner").getByRole("button").last();
      await expect(last).toHaveText(/সহায়তা/);
    }
  });

  test("role switcher changes which navigation the role sees", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/app");
    const sidebar = page.getByRole("navigation", { name: "প্রধান মেনু" }).filter({ visible: true });
    await expect(sidebar.getByRole("link")).toHaveAttribute("href", "/app");
    await page.getByLabel("ভূমিকা (ডেভেলপার)").selectOption("guardian");
    await expect(sidebar.getByRole("link")).toHaveAttribute("href", "/parent");
    await page.getByLabel("ভূমিকা (ডেভেলপার)").selectOption("platform_owner");
    await expect(sidebar.getByRole("link")).toHaveAttribute("href", "/platform");
  });
});

test.describe("reduced motion", () => {
  test("only opacity transitions remain", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev/kit");
    const props = await page
      .getByRole("button", { name: "প্রধান" })
      .evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(props).toBe("opacity");
  });
});

test.describe("accessibility (axe, WCAG 2.2 AA)", () => {
  for (const [scheme, size] of [
    ["light", PHONE],
    ["dark", PHONE],
    ["light", DESKTOP],
    ["dark", DESKTOP],
  ] as const) {
    test(`no violations: ${scheme}, ${size.width}px`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(size);
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.getByRole("banner")).toBeVisible();
        expect(await axeViolations(page), `${path} ${scheme}`).toEqual([]);
      }
    });
  }

  test("no violations with an open dialog", async ({ page }) => {
    await page.goto("/app");
    await page.getByTestId("help-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test("no violations in English", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "English" }).click();
    for (const path of PAGES) {
      await page.goto(path);
      expect(await axeViolations(page), path).toEqual([]);
    }
  });
});

test.describe("PWA", () => {
  test("manifest declares name, standalone display and the required icons", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("bn");
    expect(manifest.theme_color).toBe("#0F6E51");
    const icons = manifest.icons as Array<{ sizes: string; purpose?: string }>;
    expect(icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of icons as Array<{ src: string }>) {
      expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    }
  });

  test("the app shell still opens with no network once the service worker is active", async ({
    page,
    context,
  }) => {
    await page.goto("/app");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload(); // now controlled by the service worker
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true);

    await context.setOffline(true);
    await expect(page.getByTestId("offline-notice")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByText("ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না।")).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByTestId("offline-notice")).toBeHidden();
  });

  test("the static offline page is precached and readable", async ({ request }) => {
    const res = await request.get("/offline.html");
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain("ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না");
  });
});

test.describe("forms", () => {
  test("keeps typed values on validation error and saves with Bangla digits", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/form");
    await page.getByLabel("শিক্ষার্থীর নাম").fill("রুবেল হোসেন");
    await page.getByLabel("অভিভাবকের মোবাইল নম্বর").fill("০১৭০০");
    await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await expect(page.getByText("১১ সংখ্যার সঠিক মোবাইল নম্বর দিন।")).toBeVisible();
    await expect(page.getByLabel("শিক্ষার্থীর নাম")).toHaveValue("রুবেল হোসেন");

    await page.getByLabel("অভিভাবকের মোবাইল নম্বর").fill("০১৭০০০০০০০০");
    await page.getByLabel("শ্রেণি", { exact: true }).selectOption("6");
    await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await expect(page.getByText("সংরক্ষণ হয়েছে", { exact: true })).toBeVisible();
  });

  test("the action bar stays above the keyboard inset", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/form");
    await page.evaluate(() => {
      document.documentElement.style.setProperty("--kb-inset", "300px");
      document.documentElement.dataset.keyboard = "open";
    });
    const bar = await page.getByRole("group", { name: "ফর্মের কাজ" }).boundingBox();
    expect(bar).not.toBeNull();
    expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeCloseTo(PHONE.height - 300, 0);
    await expect(
      page.getByRole("navigation", { name: "প্রধান মেনু" }).filter({ visible: true }),
    ).toHaveCount(0);
  });
});
