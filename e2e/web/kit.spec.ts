import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PHONE = { width: 360, height: 740 };
const DESKTOP = { width: 1280, height: 800 };
const BIG_TABLE = "শিক্ষার্থীর তালিকা (১০,০০০)";
const SERVER_TABLE = "শিক্ষার্থীর তালিকা (সার্ভার)";

async function axeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

/** A real PNG made in the browser, so the test needs no fixture files. */
async function makePng(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ w, h }) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#0f6e51");
      gradient.addColorStop(1, "#c9960c");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    { w: width, h: height },
  );
  return Buffer.from(base64, "base64");
}

test.describe("DataTable", () => {
  test("10,000 rows: only a few rows are in the DOM and scrolling stays smooth on a throttled CPU", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(DESKTOP);
    await page.goto("/dev/kit");
    const table = page.getByRole("table", { name: BIG_TABLE });
    await expect(table).toBeVisible();
    await expect(table).toHaveAttribute("aria-rowcount", "10001");
    const scroller = page.locator('[data-testid="table-scroll"]').first();
    const rows = scroller.getByTestId("table-row");
    expect(await rows.count()).toBeLessThan(60);

    const client = await context.newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    // Two runs: an ordinary drag (about 2 rows per frame) and a hard fling (about 17 rows per
    // frame). Frame time is measured with requestAnimationFrame.
    const measure = (pixelsPerFrame: number, frames: number) =>
      scroller.evaluate(
        async (el, args) => {
          const times: number[] = [];
          let longest = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) longest = Math.max(longest, entry.duration);
          });
          observer.observe({ type: "longtask", buffered: false });
          el.scrollTop = 0;
          let last = performance.now();
          for (let i = 1; i <= args.frames; i++) {
            el.scrollTop = i * args.pixelsPerFrame;
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => {
                const now = performance.now();
                times.push(now - last);
                last = now;
                resolve();
              }),
            );
          }
          observer.disconnect();
          times.sort((a, b) => a - b);
          return {
            p50: times[Math.floor(times.length * 0.5)]!,
            p95: times[Math.floor(times.length * 0.95)]!,
            max: times[times.length - 1]!,
            longestTask: longest,
            domRows: el.querySelectorAll('[data-testid="table-row"]').length,
          };
        },
        { pixelsPerFrame, frames },
      );
    const drag = await measure(100, 120);
    const fling = await measure(900, 60);
    const fmt = (m: typeof drag) =>
      `p50 ${m.p50.toFixed(1)} ms, p95 ${m.p95.toFixed(1)} ms, max ${m.max.toFixed(1)} ms, longest task ${m.longestTask.toFixed(0)} ms, DOM rows ${m.domRows}`;
    test
      .info()
      .annotations.push(
        { type: "scroll drag (4x CPU)", description: fmt(drag) },
        { type: "scroll fling (4x CPU)", description: fmt(fling) },
      );
    // Lab limits, set about 50% above what this container measures (drag: p50 36-42 ms, p95
    // 65-78 ms, longest task about 150 ms, all with a 4x slower CPU and software rendering). They
    // guard against the regressions that matter (a render loop, a per-frame walk over every row)
    // and do not claim 60 fps on this machine.
    expect(drag.p50, fmt(drag)).toBeLessThan(50);
    expect(drag.p95, fmt(drag)).toBeLessThan(120);
    expect(fling.p95, fmt(fling)).toBeLessThan(200);
    expect(
      Math.max(drag.longestTask, fling.longestTask),
      `${fmt(drag)} | ${fmt(fling)}`,
    ).toBeLessThan(400);
    expect(Math.max(drag.domRows, fling.domRows)).toBeLessThan(60);
    // Jump to the very end: the last row is reachable.
    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(scroller.getByTestId("table-row").last()).toBeVisible();
    await expect(table).toContainText("০");
  });

  test("sorts, searches and selects rows on desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/dev/kit");
    const table = page.getByRole("table", { name: BIG_TABLE });
    const roll = table.getByRole("columnheader", { name: /রোল/ });
    await roll.getByRole("button").click();
    await expect(roll).toHaveAttribute("aria-sort", "descending");
    await expect(table.getByTestId("table-row").first()).toContainText("৬০");

    const firstList = page.locator("section").filter({ has: table }).last();
    await firstList.getByLabel("অনুসন্ধান").fill("সুমাইয়া");
    await expect(table.getByTestId("table-row").first()).toContainText("সুমাইয়া");

    await table.getByTestId("table-row").first().getByRole("checkbox").check();
    await expect(page.getByTestId("table-selection").first()).toContainText("১টি বাছাই করা হয়েছে");
    await table.getByRole("checkbox", { name: "এই পাতার সবগুলো বাছাই করুন" }).check();
    await expect(page.getByTestId("table-selection").first()).toContainText("বাছাই করা হয়েছে");
    await page.getByRole("button", { name: "বাছাই মুছুন" }).first().click();
    await expect(page.getByTestId("table-selection")).toHaveCount(0);
  });

  test("becomes a card list on a phone with one tap target per card", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/kit");
    await expect(page.getByRole("table")).toHaveCount(0);
    const cards = page.getByTestId("table-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(3);
    const first = cards.first();
    await expect(first.getByRole("button")).toHaveCount(1);
    const box = await first.getByRole("button").boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await first.getByRole("button").click();
    await expect(page.getByText(/খোলা হয়েছে/).first()).toBeVisible();
    // Sorting happens through a select because cards have no header row.
    await page.getByLabel("সাজান").first().selectOption("roll:desc");
    await expect(page.getByTestId("table-card").first()).toContainText("৬০");
  });

  test("server-style table pages, filters and recovers from an error", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/dev/kit");
    const table = page.getByRole("table", { name: SERVER_TABLE });
    await expect(table.getByTestId("table-row").first()).toBeVisible();
    const bar = page.getByTestId("table-pagination");
    await expect(bar).toContainText("১–২৫ / ২৪০");
    await bar.getByRole("button", { name: "পরের পাতা" }).click();
    await expect(bar).toContainText("২৬–৫০ / ২৪০");
    await bar.getByRole("button", { name: "আগের পাতা" }).click();
    await expect(bar).toContainText("১–২৫ / ২৪০");

    const filterButtons = page.getByRole("button", { name: "ফিল্টার", exact: true });
    await filterButtons.nth(1).click();
    await page.getByRole("dialog").getByRole("combobox", { name: "শাখা" }).selectOption("খ");
    await page.getByRole("button", { name: "সম্পন্ন" }).click();
    await expect(bar).toContainText("/ ৮০");

    await page.getByRole("button", { name: "ত্রুটি দেখান" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "তালিকা লোড করা যায়নি।" }),
    ).toBeVisible();
    const tableError = page.getByRole("alert").filter({ hasText: "তালিকা লোড করা যায়নি।" });
    await tableError.getByRole("button", { name: "আবার চেষ্টা করুন" }).click();
    await expect(table.getByTestId("table-row").first()).toBeVisible();
  });
});

test.describe("form kit", () => {
  test("Bangla digits become ASCII and the submit gets parsed values", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/kit");
    const form = page.getByRole("form", { name: "ফর্ম কিট" });
    await form.getByLabel("শিক্ষার্থীর নাম").fill("রুবেল হোসেন");
    await form.getByLabel("প্রাপ্ত নম্বর").fill("৯৮.৫");
    await expect(form.getByLabel("প্রাপ্ত নম্বর")).toHaveValue("98.5");
    await form.getByLabel("অভিভাবকের মোবাইল").fill("০১৭১২-৩৪৫৬৭৮");
    await form.getByLabel("জন্ম তারিখ").fill("2012-05-04");
    await form.getByLabel("শাখা").selectOption("খ");
    await form.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    const result = JSON.parse((await page.getByTestId("form-result").textContent()) ?? "{}");
    expect(result).toMatchObject({
      name: "রুবেল হোসেন",
      marks: 98.5,
      phone: "+8801712345678",
      born: "2012-05-04",
      section: "খ",
    });
  });

  test("shows translated errors and moves focus to the first wrong field", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/kit");
    const form = page.getByRole("form", { name: "ফর্ম কিট" });
    await form.getByLabel("শিক্ষার্থীর নাম").fill("আলী");
    await form.getByLabel("প্রাপ্ত নম্বর").fill("১২০");
    await form.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
    await expect(form.getByText("১০০ এর বেশি হতে পারবে না।")).toBeVisible();
    await expect(form.getByTestId("form-error-summary")).toBeVisible();
    await expect(form.getByLabel("প্রাপ্ত নম্বর")).toBeFocused();
    await expect(form.getByLabel("শিক্ষার্থীর নাম")).toHaveValue("আলী");
  });
});

test.describe("FileUpload", () => {
  test("photo: crop, compress on the device, then upload with progress", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/kit");
    const png = await makePng(page, 3000, 2000);
    const upload = page.getByTestId("file-upload").first();
    await upload
      .getByTestId("upload-gallery")
      .setInputFiles({ name: "লোগো photo.png", mimeType: "image/png", buffer: png });

    const dialog = page.getByRole("dialog", { name: "ছবি কেটে ঠিক করুন" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("crop-preview")).toBeVisible();
    await dialog.getByLabel("বড় করুন").fill("2");
    await dialog.getByLabel("ডানে-বামে সরান").fill("0.5");
    expect(await dialog.getByRole("slider").count()).toBe(3);
    expect(await axeViolations(page)).toEqual([]);
    await dialog.getByRole("button", { name: "এই অংশটি নিন" }).click();

    await expect(upload.getByRole("progressbar")).toBeVisible();
    await expect(upload.getByText("আপলোড হয়েছে")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("upload-result").first()).toContainText("demo/");

    // The cropped, compressed picture is square and no larger than 1600 px.
    const size = await upload
      .getByRole("img", { name: "বেছে নেওয়া ছবি" })
      .evaluate((img: HTMLImageElement) => ({
        w: img.naturalWidth,
        h: img.naturalHeight,
      }));
    expect(size.w).toBe(size.h);
    expect(size.w).toBeLessThanOrEqual(1600);
    expect(size.w).toBeGreaterThan(300);
  });

  test("photo without crop is resized to at most 1600 px and re-encoded smaller", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/kit");
    const png = await makePng(page, 3200, 2400);
    const upload = page.getByTestId("file-upload").nth(2);
    await upload
      .getByTestId("upload-gallery")
      .setInputFiles({ name: "camera.png", mimeType: "image/png", buffer: png });
    await expect(upload.getByText("আপলোড হয়েছে")).toBeVisible({ timeout: 10_000 });
    const size = await upload
      .getByRole("img", { name: "বেছে নেওয়া ছবি" })
      .evaluate((img: HTMLImageElement) => ({
        w: img.naturalWidth,
        h: img.naturalHeight,
      }));
    expect(size).toEqual({ w: 1600, h: 1200 });
    const bytes = Number(await page.getByTestId("upload-plain-size").getAttribute("data-bytes"));
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(png.length);
  });

  test("rejects a wrong type and an oversize file with translated messages, uploading nothing", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/kit");
    const photo = page.getByTestId("file-upload").first();
    await photo
      .getByTestId("upload-gallery")
      .setInputFiles({ name: "a.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
    await expect(photo.getByTestId("upload-error")).toContainText("এই ধরনের ফাইল নেওয়া যায় না।");

    const doc = page.getByTestId("file-upload").nth(1);
    await doc.getByTestId("upload-gallery").setInputFiles({
      name: "big.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(6 * 1024 * 1024, 1),
    });
    await expect(doc.getByTestId("upload-error")).toContainText("এর চেয়ে বড়");
    await expect(page.getByTestId("upload-result")).toHaveCount(0);
  });

  test("a failed upload shows an error and can be retried; an upload can be cancelled", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/kit");
    const doc = page.getByTestId("file-upload").nth(1);
    const pdf = {
      name: "form.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    };

    await page.getByLabel("আপলোড ব্যর্থ হোক").check();
    await doc.getByTestId("upload-gallery").setInputFiles(pdf);
    await expect(doc.getByTestId("upload-error")).toContainText("আপলোড করা যায়নি।", {
      timeout: 10_000,
    });
    await page.getByLabel("আপলোড ব্যর্থ হোক").uncheck();
    await doc.getByRole("button", { name: "আবার চেষ্টা করুন" }).click();
    await expect(doc.getByText("আপলোড হয়েছে")).toBeVisible({ timeout: 10_000 });

    await doc.getByTestId("upload-gallery").setInputFiles(pdf);
    await doc.getByRole("button", { name: "বাতিল" }).click();
    await expect(doc.getByText("আপলোড বাতিল করা হয়েছে")).toBeVisible();
  });

  test("the camera button asks for a capture input and the gallery button does not", async ({
    page,
  }) => {
    await page.goto("/dev/kit");
    const photo = page.getByTestId("file-upload").first();
    await expect(photo.getByTestId("upload-camera")).toHaveAttribute("capture", "environment");
    await expect(photo.getByTestId("upload-gallery")).not.toHaveAttribute("capture");
  });
});

test.describe("print", () => {
  test("the sample prints on exactly 3 A4 pages and the app chrome stays off paper", async ({
    page,
  }) => {
    await page.goto("/dev/print");
    await expect(page.getByTestId("print-sheet")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages).toBe(3);
    const size = pdf.toString("latin1").match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
    expect(Number(size?.[1])).toBeCloseTo(595.28, 0);
    expect(Number(size?.[2])).toBeCloseTo(841.89, 0);
  });

  test("shows an A4-wide preview that scrolls inside itself on a phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/print");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const preview = page.getByRole("region", { name: "প্রিন্ট প্রিভিউ (A4)" });
    const scrollable = await preview.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrollable).toBe(true);
  });
});

test.describe("sharing", () => {
  test("copies text, and builds WhatsApp and SMS links with the message encoded", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dev/kit");
    const message = "ফলাফল প্রকাশ হয়েছে। বিস্তারিত অ্যাপে দেখুন।";
    await page.getByRole("button", { name: "লেখা কপি করুন" }).click();
    await expect(page.getByText("কপি হয়েছে", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(message);

    const wa = await page.getByRole("link", { name: "হোয়াটসঅ্যাপে পাঠান" }).getAttribute("href");
    expect(wa?.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(wa!.split("text=")[1]!)).toBe(message);
    const sms = await page.getByRole("link", { name: "এসএমএসে পাঠান" }).getAttribute("href");
    expect(sms?.startsWith("sms:?&body=")).toBe(true);
    expect(decodeURIComponent(sms!.split("body=")[1]!)).toBe(message);
  });

  test("saves the file when this browser cannot share files", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    });
    await page.goto("/dev/kit");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "ফাইল শেয়ার করুন" }).click();
    expect((await download).suggestedFilename()).toBe("নমুনা_ফাইল.txt");
    await expect(page.getByText("ফাইলটি সংরক্ষণ করা হয়েছে")).toBeVisible();
  });

  test("hands the file to the share sheet when the browser supports it", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __shared?: { name: string; type: string; title: string } };
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      Object.defineProperty(navigator, "share", {
        value: async (data: { files: File[]; title: string }) => {
          w.__shared = { name: data.files[0]!.name, type: data.files[0]!.type, title: data.title };
        },
        configurable: true,
      });
    });
    await page.goto("/dev/kit");
    await page.getByRole("button", { name: "ফাইল শেয়ার করুন" }).click();
    await expect(page.getByText("শেয়ার করা হয়েছে", { exact: true })).toBeVisible();
    const shared = await page.evaluate(() => (window as unknown as { __shared: unknown }).__shared);
    expect(shared).toEqual({ name: "নমুনা_ফাইল.txt", type: "text/plain", title: "নমুনা ফাইল" });
  });
});

test.describe("accessibility of the new components", () => {
  test("filter sheet and crop-free table states have no axe violations", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/dev/kit");
    await page.getByRole("button", { name: "ফিল্টার", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test("the print sample has no axe violations", async ({ page }) => {
    await page.goto("/dev/print");
    expect(await axeViolations(page)).toEqual([]);
  });
});
