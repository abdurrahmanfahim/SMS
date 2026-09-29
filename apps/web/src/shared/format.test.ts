import { describe, expect, it } from "vitest";

import { defaultDigits, formatDate, formatNumber } from "./format";

describe("formatNumber", () => {
  it("uses Bangla digits for bn and ASCII for en by default", () => {
    expect(formatNumber(120, {}, "bn")).toBe("১২০");
    expect(formatNumber(120, {}, "en")).toBe("120");
  });

  it("lets the digit system be chosen independently of the language", () => {
    expect(formatNumber(12, {}, "bn", "latn")).toBe("12");
    expect(formatNumber(12, {}, "en", "bn")).toBe("১২");
  });

  it("groups thousands the Bangladeshi way", () => {
    expect(formatNumber(1234567, {}, "en", "latn")).toBe("12,34,567");
  });

  it("never mixes digit systems inside one number", () => {
    expect(formatNumber(1205.5, { maximumFractionDigits: 1 }, "bn")).toMatch(/^[০-৯,.]+$/);
  });
});

describe("formatDate", () => {
  const date = new Date("2026-09-29T00:00:00Z");

  it("formats in Bangla with Bangla digits", () => {
    expect(formatDate(date, { dateStyle: "medium" }, "bn")).toMatch(/[০-৯]/);
  });

  it("formats in English with ASCII digits", () => {
    expect(formatDate(date, { dateStyle: "medium" }, "en")).toContain("2026");
  });

  it("uses the Asia/Dhaka day boundary (UTC+6)", () => {
    // 20:00Z on the 28th is already the 29th in Dhaka.
    const late = new Date("2026-09-28T20:00:00Z");
    expect(formatDate(late, { day: "numeric" }, "en", "latn")).toBe("29");
  });
});

describe("defaultDigits", () => {
  it("follows the language", () => {
    expect(defaultDigits("bn")).toBe("bn");
    expect(defaultDigits("en")).toBe("latn");
  });
});
