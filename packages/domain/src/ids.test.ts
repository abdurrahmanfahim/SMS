import { describe, expect, it } from "vitest";

import { uuid } from "./ids.js";

describe("uuid", () => {
  it("accepts a valid UUID and canonicalizes it to lowercase", () => {
    expect(uuid("3F2504E0-4F89-41D3-9A0C-0305E82C3301")).toEqual({
      ok: true,
      value: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    });
  });

  it("accepts an already-lowercase UUID", () => {
    expect(uuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toEqual({
      ok: true,
      value: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    });
  });

  it("rejects malformed text", () => {
    expect(uuid("not-a-uuid")).toEqual({ ok: false, reason: "invalid_format" });
    expect(uuid("3f2504e0-4f89-41d3-9a0c-0305e82c330")).toEqual({
      ok: false,
      reason: "invalid_format",
    });
    expect(uuid("")).toEqual({ ok: false, reason: "invalid_format" });
  });
});
