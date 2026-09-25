import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { normalizeBdPhone } from "./phone.js";

describe("normalizeBdPhone — accepted forms", () => {
  it("accepts the local form with a dash", () => {
    expect(normalizeBdPhone("01712-345678")).toEqual({ ok: true, e164: "+8801712345678" });
  });

  it("accepts Bangla digits with a space", () => {
    expect(normalizeBdPhone("০১৭ ১২৩৪৫৬৭৮")).toEqual({ ok: true, e164: "+8801712345678" });
  });

  it("accepts the international form without a plus", () => {
    expect(normalizeBdPhone("8801712345678")).toEqual({ ok: true, e164: "+8801712345678" });
  });

  it("accepts the international form with a plus", () => {
    expect(normalizeBdPhone("+8801712345678")).toEqual({ ok: true, e164: "+8801712345678" });
  });

  it("accepts every mobile prefix from 013 to 019", () => {
    for (const prefix of ["3", "4", "5", "6", "7", "8", "9"]) {
      expect(normalizeBdPhone(`01${prefix}12345678`)).toEqual({
        ok: true,
        e164: `+8801${prefix}12345678`,
      });
    }
  });
});

describe("normalizeBdPhone — rejected forms", () => {
  it("rejects an empty or blank string", () => {
    expect(normalizeBdPhone("")).toEqual({ ok: false, reason: "empty" });
    expect(normalizeBdPhone("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects text containing letters", () => {
    expect(normalizeBdPhone("017-ABCD-5678")).toEqual({ ok: false, reason: "invalid_characters" });
  });

  it("rejects a local-shaped number with an invalid operator digit", () => {
    expect(normalizeBdPhone("01299999999")).toEqual({ ok: false, reason: "invalid_prefix" });
  });

  it("rejects an international-no-plus number with an invalid operator digit", () => {
    expect(normalizeBdPhone("8801299999999")).toEqual({ ok: false, reason: "invalid_prefix" });
  });

  it("rejects an international-plus number with an invalid operator digit", () => {
    expect(normalizeBdPhone("+8801299999999")).toEqual({ ok: false, reason: "invalid_prefix" });
  });

  it("rejects text that does not resemble a Bangladeshi mobile number at all", () => {
    expect(normalizeBdPhone("12345")).toEqual({ ok: false, reason: "unrecognized_format" });
  });
});

const nationalNumber = fc
  .tuple(
    fc.constantFrom("3", "4", "5", "6", "7", "8", "9"),
    fc.string({ unit: fc.constantFrom(..."0123456789"), minLength: 8, maxLength: 8 }),
  )
  .map(([prefix, rest]) => `1${prefix}${rest}`);

const validInput = nationalNumber.chain((national) =>
  fc.constantFrom(`0${national}`, `880${national}`, `+880${national}`),
);

describe("normalizeBdPhone — idempotence (property)", () => {
  it("normalizing an already-normalized e164 value returns the same value", () => {
    fc.assert(
      fc.property(validInput, (input) => {
        const first = normalizeBdPhone(input);
        if (!first.ok) throw new Error(`unexpected failure for ${input}`);
        const second = normalizeBdPhone(first.e164);
        expect(second).toEqual({ ok: true, e164: first.e164 });
      }),
    );
  });
});
