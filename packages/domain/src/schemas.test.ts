import { describe, expect, it } from "vitest";

import {
  bdPhoneInputSchema,
  isoDateSchema,
  moneyPoishaSchema,
  phoneE164Schema,
  takaInputSchema,
  uuidSchema,
} from "./schemas.js";

describe("uuidSchema", () => {
  it("parses and canonicalizes a valid UUID", () => {
    const result = uuidSchema.safeParse("3F2504E0-4F89-41D3-9A0C-0305E82C3301");
    expect(result).toMatchObject({ success: true, data: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" });
  });

  it("fails on an invalid UUID", () => {
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("isoDateSchema", () => {
  it("parses a valid calendar date", () => {
    const result = isoDateSchema.safeParse("2026-09-25");
    expect(result).toMatchObject({ success: true, data: "2026-09-25" });
  });

  it("fails on an invalid calendar date", () => {
    expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
  });
});

describe("phoneE164Schema", () => {
  it("accepts an already-canonical E.164 number", () => {
    const result = phoneE164Schema.safeParse("+8801712345678");
    expect(result).toMatchObject({ success: true, data: "+8801712345678" });
  });

  it("rejects a valid-but-non-canonical number (would need normalizing first)", () => {
    expect(phoneE164Schema.safeParse("01712345678").success).toBe(false);
  });

  it("rejects a number that does not normalize at all", () => {
    expect(phoneE164Schema.safeParse("not a phone number").success).toBe(false);
  });
});

describe("bdPhoneInputSchema", () => {
  it("normalizes a raw local-form number", () => {
    const result = bdPhoneInputSchema.safeParse("01712-345678");
    expect(result).toMatchObject({ success: true, data: "+8801712345678" });
  });

  it("fails on an unrecognizable number", () => {
    expect(bdPhoneInputSchema.safeParse("12345").success).toBe(false);
  });
});

describe("moneyPoishaSchema", () => {
  it("accepts a safe integer", () => {
    const result = moneyPoishaSchema.safeParse(1250);
    expect(result).toMatchObject({ success: true, data: 1250 });
  });

  it("fails on a non-integer", () => {
    expect(moneyPoishaSchema.safeParse(12.5).success).toBe(false);
  });
});

describe("takaInputSchema", () => {
  it("normalizes and parses a Bangla-digit taka amount", () => {
    const result = takaInputSchema.safeParse("১,২৫০.৫০");
    expect(result).toMatchObject({ success: true, data: 125050 });
  });

  it("fails on malformed input", () => {
    expect(takaInputSchema.safeParse("not money").success).toBe(false);
  });
});
