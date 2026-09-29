import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { IsoDate } from "../dates.js";

import {
  absentDedupeKey,
  feeDueDedupeKey,
  noticeDedupeKey,
  resultPublishedDedupeKey,
} from "./dedupe.js";

const d = (s: string): IsoDate => s as IsoDate;

describe("dedupe key builders", () => {
  it("builds the spec example and the other keys", () => {
    expect(absentDedupeKey("stu-1", d("2026-10-05"))).toEqual({
      ok: true,
      key: "absent:stu-1:2026-10-05",
    });
    expect(feeDueDedupeKey("inv-9", -3)).toEqual({ ok: true, key: "fee_due:inv-9:m3" });
    expect(feeDueDedupeKey("inv-9", 7)).toEqual({ ok: true, key: "fee_due:inv-9:p7" });
    expect(feeDueDedupeKey("inv-9", 0)).toEqual({ ok: true, key: "fee_due:inv-9:p0" });
    expect(resultPublishedDedupeKey("pub-1", "stu-1")).toEqual({
      ok: true,
      key: "result:pub-1:stu-1",
    });
    expect(noticeDedupeKey("n-1", "g-1")).toEqual({ ok: true, key: "notice:n-1:g-1" });
  });

  it("accepts UUIDs and Bangla ids", () => {
    const id = "3f2b8c1e-9d4a-4f6b-8a1c-2e7d5b9a0c11";
    expect(absentDedupeKey(id, d("2026-10-05"))).toEqual({
      ok: true,
      key: `absent:${id}:2026-10-05`,
    });
    expect(noticeDedupeKey("বিজ্ঞপ্তি১", "অভিভাবক")).toEqual({
      ok: true,
      key: "notice:বিজ্ঞপ্তি১:অভিভাবক",
    });
  });

  it("rejects empty parts, separators, whitespace, control characters and long parts", () => {
    for (const bad of ["", "a:b", "a b", "a\tb", "a\nb", "a\u0000b", "a\u007fb", "x".repeat(101)]) {
      expect(absentDedupeKey(bad, d("2026-10-05"))).toEqual({ ok: false, reason: "invalid_part" });
      expect(noticeDedupeKey("ok", bad)).toEqual({ ok: false, reason: "invalid_part" });
    }
    expect(absentDedupeKey("x".repeat(100), d("2026-10-05")).ok).toBe(true);
  });

  it("rejects invalid fee reminder offsets", () => {
    for (const bad of [366, -366, 1.5, Number.NaN]) {
      expect(feeDueDedupeKey("inv", bad)).toEqual({ ok: false, reason: "invalid_part" });
    }
    expect(feeDueDedupeKey("inv", 365).ok).toBe(true);
    expect(feeDueDedupeKey("inv", -365).ok).toBe(true);
    expect(feeDueDedupeKey("bad:id", 1).ok).toBe(false);
  });

  it("property: different inputs never build the same key", () => {
    const part = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => !/[\s:]/u.test(s));
    fc.assert(
      fc.property(part, part, part, part, (a, b, c, e) => {
        const k1 = noticeDedupeKey(a, b);
        const k2 = noticeDedupeKey(c, e);
        if (!k1.ok || !k2.ok) return;
        expect(k1.key === k2.key).toBe(a === c && b === e);
      }),
    );
    fc.assert(
      fc.property(
        fc.integer({ min: -365, max: 365 }),
        fc.integer({ min: -365, max: 365 }),
        (x, y) => {
          const k1 = feeDueDedupeKey("i", x);
          const k2 = feeDueDedupeKey("i", y);
          if (!k1.ok || !k2.ok) throw new Error("unexpected");
          expect(k1.key === k2.key).toBe(x === y);
        },
      ),
    );
  });
});
