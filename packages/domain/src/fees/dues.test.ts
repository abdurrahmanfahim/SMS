import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { IsoDate } from "../dates.js";
import type { Poisha } from "../money.js";

import { type DueInvoice, computeDues, invoiceStatus } from "./dues.js";

const p = (n: number): Poisha => n as Poisha;
const d = (s: string): IsoDate => s as IsoDate;
const inv = (
  id: string,
  dueDate: string,
  total: number,
  paidTotal: number,
  status: DueInvoice["status"] = "open",
): DueInvoice => ({
  id,
  dueDate: d(dueDate),
  total: p(total),
  paidTotal: p(paidTotal),
  status,
});

describe("invoiceStatus", () => {
  it("derives the status from totals", () => {
    expect(invoiceStatus({ total: p(100), paidTotal: p(0), void: false })).toEqual({
      ok: true,
      status: "open",
    });
    expect(invoiceStatus({ total: p(100), paidTotal: p(1), void: false })).toEqual({
      ok: true,
      status: "partially_paid",
    });
    expect(invoiceStatus({ total: p(100), paidTotal: p(100), void: false })).toEqual({
      ok: true,
      status: "paid",
    });
    expect(invoiceStatus({ total: p(0), paidTotal: p(0), void: false })).toEqual({
      ok: true,
      status: "paid",
    });
    expect(invoiceStatus({ total: p(100), paidTotal: p(40), void: true })).toEqual({
      ok: true,
      status: "void",
    });
  });
  it("rejects impossible amounts", () => {
    for (const [total, paid] of [
      [100, 101],
      [-1, 0],
      [100, -1],
      [1.5, 0],
      [100, 0.5],
    ] as const) {
      expect(invoiceStatus({ total: p(total), paidTotal: p(paid), void: false })).toEqual({
        ok: false,
        reason: "invalid_amounts",
      });
    }
  });
});

describe("computeDues", () => {
  const asOf = d("2026-10-31");

  it("puts open amounts into aging buckets by days past due", () => {
    const r = computeDues(
      [
        inv("future", "2026-11-01", 1000, 0), // -1 day
        inv("today", "2026-10-31", 2000, 500), // 0 days -> 0-30
        inv("d30", "2026-10-01", 3000, 0), // 30 days -> 0-30
        inv("d31", "2026-09-30", 4000, 1000), // 31 days -> 31-60
        inv("d60", "2026-09-01", 5000, 0), // 60 days -> 31-60
        inv("d61", "2026-08-31", 6000, 0), // 61 days -> 61+
      ],
      asOf,
    );
    if (!r.ok) throw new Error("unexpected");
    expect(r.notDue).toBe(1000);
    expect(r.buckets).toEqual({
      days0to30: 1500 + 3000,
      days31to60: 3000 + 5000,
      days61plus: 6000,
    });
    expect(r.totalDue).toBe(1000 + 4500 + 8000 + 6000);
    expect(r.invoices.map((i) => [i.id, i.daysPastDue, i.bucket, i.open])).toEqual([
      ["future", -1, "not_due", 1000],
      ["today", 0, "0-30", 1500],
      ["d30", 30, "0-30", 3000],
      ["d31", 31, "31-60", 3000],
      ["d60", 60, "31-60", 5000],
      ["d61", 61, "61+", 6000],
    ]);
  });

  it("ignores void and fully paid invoices; empty input gives zeros", () => {
    const r = computeDues(
      [inv("v", "2026-01-01", 1000, 0, "void"), inv("p", "2026-01-01", 1000, 1000, "paid")],
      asOf,
    );
    expect(r).toEqual({
      ok: true,
      totalDue: 0,
      notDue: 0,
      buckets: { days0to30: 0, days31to60: 0, days61plus: 0 },
      invoices: [],
    });
    expect(computeDues([], asOf)).toMatchObject({ ok: true, totalDue: 0 });
  });

  it("counts days across month, year and leap-day boundaries", () => {
    const r = computeDues([inv("a", "2028-02-28", 100, 0)], d("2028-03-01"));
    if (!r.ok) throw new Error("unexpected");
    expect(r.invoices[0]?.daysPastDue).toBe(2);
    const y = computeDues([inv("b", "2026-12-31", 100, 0)], d("2027-01-01"));
    if (!y.ok) throw new Error("unexpected");
    expect(y.invoices[0]?.daysPastDue).toBe(1);
  });

  it("rejects invalid invoices and overflow", () => {
    for (const bad of [
      inv("x", "2026-01-01", 100, 101),
      inv("x", "2026-01-01", -1, 0),
      inv("x", "2026-01-01", 100, -1),
      inv("x", "2026-01-01", 1.5, 0),
      inv("x", "2026-01-01", 100, 0.5),
    ]) {
      expect(computeDues([bad], asOf)).toEqual({ ok: false, reason: "invalid_invoice", id: "x" });
    }
    const big = Number.MAX_SAFE_INTEGER;
    expect(
      computeDues([inv("a", "2026-01-01", big, 0), inv("b", "2026-01-01", big, 0)], asOf),
    ).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("property: totalDue equals notDue plus all buckets and equals total minus paid over non-void invoices", () => {
    const row = fc.record({
      offset: fc.integer({ min: -100, max: 200 }),
      total: fc.integer({ min: 0, max: 1_000_000 }),
      paidShare: fc.integer({ min: 0, max: 100 }),
      isVoid: fc.boolean(),
    });
    fc.assert(
      fc.property(fc.array(row, { maxLength: 12 }), (rows) => {
        const base = Date.UTC(2026, 9, 31);
        const invoices = rows.map((r, i) => {
          const due = new Date(base - r.offset * 86_400_000).toISOString().slice(0, 10);
          return inv(
            `i${i}`,
            due,
            r.total,
            Math.trunc((r.total * r.paidShare) / 100),
            r.isVoid ? "void" : "open",
          );
        });
        const r = computeDues(invoices, asOf);
        if (!r.ok) throw new Error("unexpected");
        const { days0to30, days31to60, days61plus } = r.buckets;
        expect(r.totalDue).toBe(r.notDue + days0to30 + days31to60 + days61plus);
        const expected = invoices
          .filter((i) => i.status !== "void")
          .reduce((s, i) => s + (i.total - i.paidTotal), 0);
        expect(r.totalDue).toBe(expected);
      }),
    );
  });
});
