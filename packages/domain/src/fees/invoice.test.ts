import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { IsoDate } from "../dates.js";
import type { Poisha } from "../money.js";

import { type PlanItem, calculateInvoiceLines, periodKey } from "./invoice.js";
import type { Waiver } from "./waivers.js";

const p = (n: number): Poisha => n as Poisha;
const d = (s: string): IsoDate => s as IsoDate;
const item = (over: Partial<PlanItem> & { id: string }): PlanItem => ({
  feeHeadId: `head-${over.id}`,
  descriptionBn: `ফি ${over.id}`,
  amount: p(100000),
  frequency: "monthly",
  dueDay: null,
  months: null,
  sortOrder: 1,
  ...over,
});
const oct = { kind: "month", year: 2026, month: 10 } as const;
const issue = d("2026-10-01");

function ok(result: ReturnType<typeof calculateInvoiceLines>) {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result;
}

describe("periodKey", () => {
  it("builds the stored period strings", () => {
    expect(periodKey(oct)).toBe("2026-10");
    expect(periodKey({ kind: "month", year: 2026, month: 1 })).toBe("2026-01");
    expect(periodKey({ kind: "term", term: 1 })).toBe("term-1");
  });
  it("rejects invalid periods", () => {
    expect(periodKey({ kind: "month", year: 2026, month: 13 })).toBeNull();
    expect(periodKey({ kind: "month", year: 2026, month: 0 })).toBeNull();
    expect(periodKey({ kind: "month", year: 99, month: 1 })).toBeNull();
    expect(periodKey({ kind: "term", term: 0 })).toBeNull();
    expect(periodKey({ kind: "term", term: 1.5 })).toBeNull();
  });
});

describe("calculateInvoiceLines: which items are billed", () => {
  const items = [
    item({ id: "tuition", frequency: "monthly", sortOrder: 1 }),
    item({ id: "exam-fee", frequency: "term", sortOrder: 2 }),
    item({ id: "lab", frequency: "monthly", months: [3, 10], sortOrder: 3 }),
    item({ id: "term-in-oct", frequency: "term", months: [10], sortOrder: 4 }),
    item({ id: "admission", frequency: "once", sortOrder: 5 }),
    item({ id: "model-test", frequency: "per_exam", sortOrder: 6 }),
  ];
  const ids = (r: ReturnType<typeof calculateInvoiceLines>) => ok(r).lines.map((l) => l.itemId);

  it("monthly items follow months; term items follow terms; once and per_exam need listing", () => {
    expect(ids(calculateInvoiceLines({ period: oct, items, issueDate: issue }))).toEqual([
      "tuition",
      "lab",
      "term-in-oct",
    ]);
    const nov = { kind: "month", year: 2026, month: 11 } as const;
    expect(ids(calculateInvoiceLines({ period: nov, items, issueDate: issue }))).toEqual([
      "tuition",
    ]);
    expect(
      ids(calculateInvoiceLines({ period: { kind: "term", term: 2 }, items, issueDate: issue })),
    ).toEqual(["exam-fee", "term-in-oct"]);
    expect(
      ids(
        calculateInvoiceLines({
          period: oct,
          items,
          issueDate: issue,
          includeItemIds: ["admission", "model-test"],
        }),
      ),
    ).toEqual(["tuition", "lab", "term-in-oct", "admission", "model-test"]);
  });

  it("does not bill a listed item twice", () => {
    const r = ok(
      calculateInvoiceLines({ period: oct, items, issueDate: issue, includeItemIds: ["tuition"] }),
    );
    expect(r.lines.filter((l) => l.itemId === "tuition")).toHaveLength(1);
  });

  it("orders lines by sort order then item id", () => {
    const same = [
      item({ id: "b", sortOrder: 1 }),
      item({ id: "a", sortOrder: 1 }),
      item({ id: "c", sortOrder: 0 }),
    ];
    expect(ids(calculateInvoiceLines({ period: oct, items: same, issueDate: issue }))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});

describe("calculateInvoiceLines: amounts", () => {
  it("applies overrides and waivers and totals", () => {
    const waivers: Waiver[] = [
      {
        kind: "percent",
        value: 5000,
        feeHeadId: "head-tuition",
        startsOn: d("2026-01-01"),
        endsOn: null,
      },
      {
        kind: "fixed",
        value: 10000,
        feeHeadId: null,
        startsOn: d("2026-01-01"),
        endsOn: d("2026-12-31"),
      },
    ];
    const r = ok(
      calculateInvoiceLines({
        period: oct,
        items: [item({ id: "tuition", amount: p(100001) }), item({ id: "bus", amount: p(50000) })],
        overrides: { "head-bus": p(40000) },
        waivers,
        issueDate: issue,
      }),
    );
    // tuition: 100001 -> 50% = 50001 (half up), then fixed 10000 -> net 40000; bus: override 40000 -> fixed 10000 -> 30000
    expect(r.lines).toEqual([
      {
        itemId: "bus",
        feeHeadId: "head-bus",
        descriptionBn: "ফি bus",
        gross: 40000,
        waiverAmount: 10000,
        amount: 30000,
      },
      {
        itemId: "tuition",
        feeHeadId: "head-tuition",
        descriptionBn: "ফি tuition",
        gross: 100001,
        waiverAmount: 60001,
        amount: 40000,
      },
    ]);
    expect(r.gross).toBe(140001);
    expect(r.waiver).toBe(70001);
    expect(r.total).toBe(70000);
    expect(r.period).toBe("2026-10");
  });

  it("returns an empty invoice when nothing matches", () => {
    const r = ok(calculateInvoiceLines({ period: oct, items: [], issueDate: issue }));
    expect(r).toMatchObject({ lines: [], gross: 0, waiver: 0, total: 0, dueDate: null });
  });

  it("property: total = gross - waiver = sum of line amounts, and every waiver stays within its line", () => {
    const itemArb = fc.array(
      fc.record({
        amount: fc.integer({ min: 0, max: 5_000_000 }),
        sortOrder: fc.integer({ min: 0, max: 5 }),
      }),
      { maxLength: 6 },
    );
    fc.assert(
      fc.property(
        itemArb,
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100000 }),
        (rows, bp, fixed) => {
          const items = rows.map((row, i) =>
            item({ id: `i${i}`, amount: p(row.amount), sortOrder: row.sortOrder }),
          );
          const waivers: Waiver[] = [
            {
              kind: "percent",
              value: bp,
              feeHeadId: null,
              startsOn: d("2026-01-01"),
              endsOn: null,
            },
            {
              kind: "fixed",
              value: fixed,
              feeHeadId: null,
              startsOn: d("2026-01-01"),
              endsOn: null,
            },
          ];
          const r = ok(calculateInvoiceLines({ period: oct, items, waivers, issueDate: issue }));
          expect(r.total).toBe(r.gross - r.waiver);
          expect(r.lines.reduce((s, l) => s + l.amount, 0)).toBe(r.total);
          for (const line of r.lines) {
            expect(line.waiverAmount).toBeLessThanOrEqual(line.gross);
            expect(line.amount + line.waiverAmount).toBe(line.gross);
          }
        },
      ),
    );
  });
});

describe("calculateInvoiceLines: due date", () => {
  it("uses the earliest due day of the billed items and clamps to the month length", () => {
    const items = [
      item({ id: "a", dueDay: 15 }),
      item({ id: "b", dueDay: 10 }),
      item({ id: "c", dueDay: null }),
    ];
    expect(ok(calculateInvoiceLines({ period: oct, items, issueDate: issue })).dueDate).toBe(
      "2026-10-10",
    );
    const feb = { kind: "month", year: 2026, month: 2 } as const;
    expect(
      ok(
        calculateInvoiceLines({
          period: feb,
          items: [item({ id: "a", dueDay: 31 })],
          issueDate: issue,
        }),
      ).dueDate,
    ).toBe("2026-02-28");
    const leap = { kind: "month", year: 2028, month: 2 } as const;
    expect(
      ok(
        calculateInvoiceLines({
          period: leap,
          items: [item({ id: "a", dueDay: 30 })],
          issueDate: issue,
        }),
      ).dueDate,
    ).toBe("2028-02-29");
  });
  it("is null without due days and for terms", () => {
    expect(
      ok(calculateInvoiceLines({ period: oct, items: [item({ id: "a" })], issueDate: issue }))
        .dueDate,
    ).toBeNull();
    expect(
      ok(
        calculateInvoiceLines({
          period: { kind: "term", term: 1 },
          items: [item({ id: "a", frequency: "term", dueDay: 5 })],
          issueDate: issue,
        }),
      ).dueDate,
    ).toBeNull();
  });
});

describe("calculateInvoiceLines: invalid input", () => {
  const fail = (input: Parameters<typeof calculateInvoiceLines>[0]) => {
    const r = calculateInvoiceLines(input);
    if (r.ok) throw new Error("expected an error");
    return r;
  };
  it("reports each kind of problem", () => {
    expect(fail({ period: { kind: "term", term: 0 }, items: [], issueDate: issue })).toEqual({
      ok: false,
      reason: "invalid_period",
    });
    expect(
      fail({ period: oct, items: [item({ id: "a" }), item({ id: "a" })], issueDate: issue }),
    ).toEqual({ ok: false, reason: "duplicate_item_id", id: "a" });
    for (const bad of [
      item({ id: "x", amount: p(-1) }),
      item({ id: "x", amount: p(1.5) }),
      item({ id: "x", dueDay: 0 }),
      item({ id: "x", dueDay: 32 }),
      item({ id: "x", dueDay: 1.5 }),
      item({ id: "x", months: [0] }),
      item({ id: "x", months: [13] }),
      item({ id: "x", months: [1.5] }),
    ]) {
      expect(fail({ period: oct, items: [bad], issueDate: issue })).toEqual({
        ok: false,
        reason: "invalid_item",
        id: "x",
      });
    }
    expect(
      fail({ period: oct, items: [item({ id: "a" })], overrides: { h: p(-1) }, issueDate: issue }),
    ).toEqual({ ok: false, reason: "invalid_override", id: "h" });
    expect(
      fail({ period: oct, items: [item({ id: "a" })], overrides: { h: p(0.5) }, issueDate: issue }),
    ).toEqual({ ok: false, reason: "invalid_override", id: "h" });
    expect(
      fail({ period: oct, items: [item({ id: "a" })], includeItemIds: ["zzz"], issueDate: issue }),
    ).toEqual({ ok: false, reason: "unknown_include_item", id: "zzz" });
    const badWaiver: Waiver = {
      kind: "percent",
      value: 20000,
      feeHeadId: null,
      startsOn: d("2026-01-01"),
      endsOn: null,
    };
    expect(
      fail({ period: oct, items: [item({ id: "a" })], waivers: [badWaiver], issueDate: issue }),
    ).toEqual({ ok: false, reason: "invalid_waiver", id: "a" });
  });
});
