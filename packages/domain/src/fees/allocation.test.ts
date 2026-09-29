import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { IsoDate } from "../dates.js";
import type { Poisha } from "../money.js";

import { type AllocationMode, type OpenInvoice, allocatePayment } from "./allocation.js";

const p = (n: number): Poisha => n as Poisha;
const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../fixtures/fees/allocation.json", import.meta.url)),
    "utf8",
  ),
) as {
  invoices: { id: string; number: string; dueDate: string; openAmount: number }[];
  scenarios: {
    name: string;
    amount: number;
    mode: AllocationMode;
    allocations: { invoiceId: string; amount: number }[];
    advance: number;
  }[];
};
const invoices = fixture.invoices as unknown as OpenInvoice[];

function ok(result: ReturnType<typeof allocatePayment>) {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result;
}

describe("allocatePayment: fixtures", () => {
  for (const s of fixture.scenarios) {
    it(s.name, () => {
      const r = ok(allocatePayment({ amount: p(s.amount), invoices, mode: s.mode }));
      expect(r.allocations).toEqual(s.allocations);
      expect(r.advance).toBe(s.advance);
      expect(r.allocated + r.advance).toBe(s.amount);
    });
  }

  it("reports every invoice's open amount afterwards, oldest first", () => {
    const r = ok(
      allocatePayment({
        amount: p(60000),
        invoices: [...invoices].reverse(),
        mode: { kind: "oldest_first" },
      }),
    );
    expect(r.remaining).toEqual([
      { invoiceId: "A", openAmount: 0 },
      { invoiceId: "B", openAmount: 20000 },
      { invoiceId: "C", openAmount: 20000 },
    ]);
  });
});

describe("allocatePayment: ordering and edge cases", () => {
  const inv = (id: string, dueDate: string, number: string, openAmount: number): OpenInvoice => ({
    id,
    number,
    dueDate: dueDate as IsoDate,
    openAmount: p(openAmount),
  });

  it("breaks ties by invoice number, then id", () => {
    const list = [
      inv("z", "2026-01-01", "N2", 10),
      inv("y", "2026-01-01", "N1", 10),
      inv("a", "2026-01-01", "N1", 10),
    ];
    const r = ok(
      allocatePayment({ amount: p(25), invoices: list, mode: { kind: "oldest_first" } }),
    );
    expect(r.allocations.map((a) => a.invoiceId)).toEqual(["a", "y", "z"]);
    expect(r.allocations.map((a) => a.amount)).toEqual([10, 10, 5]);
  });

  it("skips invoices with nothing open and works with no invoices (all advance)", () => {
    const r = ok(
      allocatePayment({
        amount: p(50),
        invoices: [inv("a", "2026-01-01", "N1", 0)],
        mode: { kind: "oldest_first" },
      }),
    );
    expect(r).toMatchObject({ allocations: [], advance: 50, allocated: 0 });
    expect(
      ok(allocatePayment({ amount: p(50), invoices: [], mode: { kind: "oldest_first" } })).advance,
    ).toBe(50);
    expect(
      ok(allocatePayment({ amount: p(50), invoices: [], mode: { kind: "chosen", invoiceIds: [] } }))
        .advance,
    ).toBe(50);
  });

  it("rejects bad input", () => {
    const one = [inv("a", "2026-01-01", "N1", 10)];
    const oldest: AllocationMode = { kind: "oldest_first" };
    for (const amount of [0, -5, 1.5, Number.NaN]) {
      expect(allocatePayment({ amount: p(amount), invoices: one, mode: oldest })).toEqual({
        ok: false,
        reason: "invalid_amount",
      });
    }
    expect(
      allocatePayment({ amount: p(5), invoices: [inv("a", "2026-01-01", "N1", -1)], mode: oldest }),
    ).toEqual({ ok: false, reason: "invalid_open_amount", id: "a" });
    expect(
      allocatePayment({
        amount: p(5),
        invoices: [inv("a", "2026-01-01", "N1", 1.5)],
        mode: oldest,
      }),
    ).toEqual({ ok: false, reason: "invalid_open_amount", id: "a" });
    expect(allocatePayment({ amount: p(5), invoices: [...one, ...one], mode: oldest })).toEqual({
      ok: false,
      reason: "duplicate_invoice",
      id: "a",
    });
    expect(
      allocatePayment({
        amount: p(5),
        invoices: one,
        mode: { kind: "chosen", invoiceIds: ["nope"] },
      }),
    ).toEqual({ ok: false, reason: "unknown_invoice", id: "nope" });
    expect(
      allocatePayment({
        amount: p(5),
        invoices: one,
        mode: { kind: "chosen", invoiceIds: ["a", "a"] },
      }),
    ).toEqual({ ok: false, reason: "duplicate_chosen_invoice", id: "a" });
  });
});

const invoiceArb = fc.array(
  fc.record({
    day: fc.integer({ min: 1, max: 28 }),
    month: fc.integer({ min: 1, max: 12 }),
    openAmount: fc.integer({ min: 0, max: 1_000_000 }),
  }),
  { maxLength: 8 },
);

function build(rows: { day: number; month: number; openAmount: number }[]): OpenInvoice[] {
  return rows.map((row, i) => ({
    id: `inv${i}`,
    number: `INV-2026-${String(i + 1).padStart(6, "0")}`,
    dueDate:
      `2026-${String(row.month).padStart(2, "0")}-${String(row.day).padStart(2, "0")}` as IsoDate,
    openAmount: p(row.openAmount),
  }));
}

describe("allocatePayment: properties", () => {
  it("never allocates more than the payment or more than an invoice's open amount", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        invoiceArb,
        fc.boolean(),
        fc.array(fc.nat(7), { maxLength: 8 }),
        (amount, rows, useChosen, picks) => {
          const list = build(rows);
          const chosenIds = [...new Set(picks.filter((n) => n < list.length))].map(
            (n) => `inv${n}`,
          );
          const mode: AllocationMode = useChosen
            ? { kind: "chosen", invoiceIds: chosenIds }
            : { kind: "oldest_first" };
          const r = ok(allocatePayment({ amount: p(amount), invoices: list, mode }));
          const byId = new Map(list.map((i) => [i.id, i.openAmount as number]));
          let total = 0;
          for (const a of r.allocations) {
            expect(a.amount).toBeGreaterThan(0);
            expect(a.amount).toBeLessThanOrEqual(byId.get(a.invoiceId) as number);
            total += a.amount;
          }
          expect(total).toBeLessThanOrEqual(amount);
          expect(total).toBe(r.allocated);
          expect(r.allocated + r.advance).toBe(amount);
          for (const row of r.remaining) {
            const before = byId.get(row.invoiceId) as number;
            const given = r.allocations.find((a) => a.invoiceId === row.invoiceId)?.amount ?? 0;
            expect(row.openAmount).toBe(before - given);
            expect(row.openAmount).toBeGreaterThanOrEqual(0);
          }
        },
      ),
    );
  });

  it("oldest first: an invoice only gets money once every older open invoice is fully paid", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5_000_000 }), invoiceArb, (amount, rows) => {
        const r = ok(
          allocatePayment({
            amount: p(amount),
            invoices: build(rows),
            mode: { kind: "oldest_first" },
          }),
        );
        const order = r.remaining.map((row) => row.openAmount);
        for (const [i, row] of r.remaining.entries()) {
          const got = r.allocations.some((a) => a.invoiceId === row.invoiceId);
          if (got) {
            // every earlier invoice is fully paid (open 0)
            for (const earlier of r.remaining.slice(0, i)) expect(earlier.openAmount).toBe(0);
          }
        }
        // leftover money exists only if nothing is open anymore
        if (r.advance > 0) expect(order.every((open) => open === 0)).toBe(true);
      }),
    );
  });

  it("chosen invoices: nothing goes to an invoice that was not chosen", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        invoiceArb,
        fc.array(fc.nat(7), { maxLength: 8 }),
        (amount, rows, picks) => {
          const list = build(rows);
          const chosenIds = [...new Set(picks.filter((n) => n < list.length))].map(
            (n) => `inv${n}`,
          );
          const r = ok(
            allocatePayment({
              amount: p(amount),
              invoices: list,
              mode: { kind: "chosen", invoiceIds: chosenIds },
            }),
          );
          for (const a of r.allocations) expect(chosenIds).toContain(a.invoiceId);
        },
      ),
    );
  });
});
