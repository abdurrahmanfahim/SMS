import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { asciiToBn, bnToAscii, normalizeNumericInput } from "./digits.js";

const asciiDigitChar = fc.integer({ min: 0, max: 9 }).map((n) => String(n));
const ASCII_ALPHABET = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", " ", ".", ","];
const BN_ALPHABET = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯", "ক", "খ", " ", "."];

describe("bnToAscii", () => {
  it("converts Bangla digits to ASCII", () => {
    expect(bnToAscii("৳ ১২৩.৫০")).toBe("৳ 123.50");
  });

  it("leaves non-digit text untouched", () => {
    expect(bnToAscii("Roll ৪২, Class ৮")).toBe("Roll 42, Class 8");
  });

  it("leaves already-ASCII text untouched", () => {
    expect(bnToAscii("abc 123")).toBe("abc 123");
  });
});

describe("asciiToBn", () => {
  it("converts ASCII digits to Bangla", () => {
    expect(asciiToBn("Roll 42")).toBe("Roll ৪২");
  });

  it("leaves non-digit text untouched", () => {
    expect(asciiToBn("no digits here")).toBe("no digits here");
  });
});

describe("digit round-trips (property)", () => {
  it("bnToAscii(asciiToBn(x)) === x for ASCII-digit text", () => {
    fc.assert(
      fc.property(fc.string({ unit: fc.constantFrom(...ASCII_ALPHABET) }), (text) => {
        expect(bnToAscii(asciiToBn(text))).toBe(text);
      }),
    );
  });

  it("asciiToBn(bnToAscii(x)) === x for Bangla-digit text", () => {
    fc.assert(
      fc.property(fc.string({ unit: fc.constantFrom(...BN_ALPHABET) }), (text) => {
        expect(asciiToBn(bnToAscii(text))).toBe(text);
      }),
    );
  });

  it("converting a mix of digits and letters only ever touches the digits", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(asciiDigitChar, fc.constantFrom("a", "b", " ", "."))),
        (chars) => {
          const text = chars.join("");
          const roundTripped = bnToAscii(asciiToBn(text));
          expect(roundTripped).toBe(text);
        },
      ),
    );
  });
});

describe("normalizeNumericInput", () => {
  it("converts Bangla digits and strips thousands separators", () => {
    expect(normalizeNumericInput("১,২৫০.৫০")).toBe("1250.50");
  });

  it("strips internal spaces", () => {
    expect(normalizeNumericInput(" ১ ২৫০ ")).toBe("1250");
  });

  it("passes ASCII numeric text through unchanged apart from separators", () => {
    expect(normalizeNumericInput("1,250.50")).toBe("1250.50");
  });

  it("leaves a leading sign in place", () => {
    expect(normalizeNumericInput("-১২৫০")).toBe("-1250");
  });
});
