import { describe, expect, it } from "vitest";

import {
  formatPoisha,
  isoDate,
  normalizeBdPhone,
  normalizeName,
  poisha,
  uuid,
  uuidSchema,
} from "./index.js";

describe("the public entry point", () => {
  it("re-exports money, dates, phone, names, ids, and schemas", () => {
    const amount = poisha(150000);
    if (!amount.ok) throw new Error("unexpected");

    expect(amount).toEqual({ ok: true, value: 150000 });
    expect(formatPoisha(amount.value)).toBe("1,500");
    expect(isoDate("2026-09-25")).toEqual({ ok: true, value: "2026-09-25" });
    expect(normalizeBdPhone("01712345678")).toEqual({ ok: true, e164: "+8801712345678" });
    expect(normalizeName("  Abdur   Rahman ")).toBe("Abdur Rahman");
    expect(uuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301").ok).toBe(true);
    expect(uuidSchema.safeParse("3f2504e0-4f89-41d3-9a0c-0305e82c3301").success).toBe(true);
  });
});
