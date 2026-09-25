import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { nameSearchKey, normalizeName } from "./names.js";

describe("normalizeName", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeName("  Abdur   Rahman  ")).toBe("Abdur Rahman");
  });

  it("normalizes the deprecated single-code-point nukta letter to its canonical decomposed form", () => {
    const decomposed = "\u09A1\u09BC"; // ড + nukta, written as two code points (the canonical form)
    const singleCodePoint = "\u09DC"; // ড়, the deprecated single-code-point form of the same letter
    expect(normalizeName(singleCodePoint)).toBe(decomposed);
    expect(normalizeName(decomposed)).toBe(decomposed);
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeName("   ")).toBe("");
  });
});

describe("nameSearchKey", () => {
  it("is case-insensitive for Latin names", () => {
    expect(nameSearchKey("Abdur Rahman")).toBe(nameSearchKey("abdur rahman"));
  });

  it("is diacritic-insensitive for Latin names", () => {
    expect(nameSearchKey("José")).toBe(nameSearchKey("jose"));
  });

  it("gives the same key for a Bangla name typed as precomposed or decomposed Unicode", () => {
    const decomposed = "র\u09BE\u09A1\u09BC\u09C0"; // includes ড + nukta
    const precomposed = "রা\u09DCী"; // includes the precomposed ড়
    expect(nameSearchKey(decomposed)).toBe(nameSearchKey(precomposed));
  });

  it("does not merge a Bangla letter with and without a nukta", () => {
    // ড় (with nukta) and ড (without) are different letters and should not collide.
    expect(nameSearchKey("ড়")).not.toBe(nameSearchKey("ড"));
  });

  it("collapses whitespace the same way normalizeName does", () => {
    expect(nameSearchKey("  Abdur   Rahman  ")).toBe("abdur rahman");
  });

  it("property: is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        expect(nameSearchKey(nameSearchKey(name))).toBe(nameSearchKey(name));
      }),
    );
  });
});
