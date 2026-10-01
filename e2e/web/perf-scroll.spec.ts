import { expect, test } from "@playwright/test";

/**
 * Scroll performance of the 10,000-row table. It lives in its own file because the "perf" Playwright
 * project runs after all other tests, alone: timing measured while other browsers compete for the
 * same CPU is noise (the same test read p50 36 ms alone and 103 ms beside 3 other workers).
 */
const DESKTOP = { width: 1280, height: 800 };
const BIG_TABLE = "শিক্ষার্থীর তালিকা (১০,০০০)";

test.describe("DataTable performance", () => {
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
    // Limits are deliberately loose because this machine's speed varies a lot: the very same build
    // measured drag p50 36-48 ms on one day and 97-117 ms on another (checked by building the
    // earlier commit side by side). They guard against what actually breaks the page, a render loop
    // or a per-frame walk over all 10,000 rows (seconds per frame), not against a 2x slower runner.
    // The measured numbers go in the report; each run also records them as annotations.
    expect(drag.p50, fmt(drag)).toBeLessThan(250);
    expect(drag.p95, fmt(drag)).toBeLessThan(450);
    expect(fling.p95, fmt(fling)).toBeLessThan(800);
    expect(
      Math.max(drag.longestTask, fling.longestTask),
      `${fmt(drag)} | ${fmt(fling)}`,
    ).toBeLessThan(1000);
    expect(Math.max(drag.domRows, fling.domRows)).toBeLessThan(60);
    // Jump to the very end: the last row is reachable.
    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(scroller.getByTestId("table-row").last()).toBeVisible();
    await expect(table).toContainText("০");
  });
});
