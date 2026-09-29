import { expect, test } from "@playwright/test";

/**
 * Lab proxy for the Core Web Vitals field targets (docs/decisions/0005-performance-budget.md):
 * slow-4G network (1.6 Mbps down, 150 ms RTT) and 4x CPU throttling on a 360px phone,
 * cold cache. Budgets: LCP <= 2.5 s, CLS <= 0.1.
 */
test("shell route meets the lab LCP and CLS budgets on slow 4G with 4x CPU", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __cls: number };
    w.__lcp = 0;
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{
        value: number;
        hadRecentInput: boolean;
      }>) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/app", { waitUntil: "load" });
  await expect(page.getByRole("banner")).toBeVisible();
  await page.waitForTimeout(1500);

  const { lcp, cls } = await page.evaluate(() => {
    const w = window as unknown as { __lcp: number; __cls: number };
    return { lcp: w.__lcp, cls: w.__cls };
  });
  test.info().annotations.push({
    type: "metrics",
    description: `LCP ${Math.round(lcp)} ms, CLS ${cls.toFixed(3)}`,
  });

  console.log(`lab metrics: LCP ${Math.round(lcp)} ms, CLS ${cls.toFixed(3)}`);
  expect(lcp).toBeGreaterThan(0);
  expect(lcp).toBeLessThanOrEqual(2500);
  expect(cls).toBeLessThanOrEqual(0.1);
});
