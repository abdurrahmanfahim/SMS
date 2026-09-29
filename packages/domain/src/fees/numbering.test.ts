import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { formatDocumentNumber, parseDocumentNumber } from "./numbering.js";

describe("document numbers", () => {
  it("formats invoices and receipts (spec §2 examples)", () => {
    expect(formatDocumentNumber("invoice", 2026, 123)).toEqual({
      ok: true,
      number: "INV-2026-000123",
    });
    expect(formatDocumentNumber("receipt", 2026, 45)).toEqual({
      ok: true,
      number: "RCPT-2026-000045",
    });
    expect(formatDocumentNumber("invoice", 2026, 1)).toEqual({
      ok: true,
      number: "INV-2026-000001",
    });
    expect(formatDocumentNumber("invoice", 2026, 999999)).toEqual({
      ok: true,
      number: "INV-2026-999999",
    });
  });

  it("rejects out-of-range years and sequences", () => {
    for (const year of [999, 10000, 2026.5, Number.NaN]) {
      expect(formatDocumentNumber("invoice", year, 1)).toEqual({
        ok: false,
        reason: "invalid_year",
      });
    }
    for (const seq of [0, -1, 1000000, 1.5, Number.NaN]) {
      expect(formatDocumentNumber("invoice", 2026, seq)).toEqual({
        ok: false,
        reason: "invalid_sequence",
      });
    }
  });

  it("parses what it formats and rejects everything else", () => {
    expect(parseDocumentNumber("INV-2026-000123")).toEqual({
      ok: true,
      kind: "invoice",
      year: 2026,
      sequence: 123,
    });
    expect(parseDocumentNumber("RCPT-2026-000045")).toEqual({
      ok: true,
      kind: "receipt",
      year: 2026,
      sequence: 45,
    });
    for (const bad of [
      "",
      "INV-2026-123",
      "inv-2026-000123",
      "INV-2026-000000",
      "INV-26-000123",
      "INV-2026-0001234",
      "X-2026-000123",
    ]) {
      expect(parseDocumentNumber(bad)).toEqual({ ok: false, reason: "invalid_format" });
    }
  });

  it("property: parse(format(x)) returns x, and numbers sort in sequence order", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("invoice" as const, "receipt" as const),
        fc.integer({ min: 1000, max: 9999 }),
        fc.integer({ min: 1, max: 999999 }),
        fc.integer({ min: 1, max: 999999 }),
        (kind, year, a, b) => {
          const fa = formatDocumentNumber(kind, year, a);
          const fb = formatDocumentNumber(kind, year, b);
          if (!fa.ok || !fb.ok) throw new Error("unexpected");
          expect(parseDocumentNumber(fa.number)).toEqual({ ok: true, kind, year, sequence: a });
          expect(a < b).toBe(fa.number < fb.number);
        },
      ),
    );
  });
});
