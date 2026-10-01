import { beforeEach, describe, expect, it } from "vitest";

import { setLocale } from "../i18n";

import { translateCellError, validateCell } from "./cell";
import type { CellError, EntryColumn } from "./types";

beforeEach(() => setLocale("bn"));

const marks: EntryColumn = { id: "m", label: "Marks", type: "number", min: 0, max: 100 };
const code: EntryColumn = {
  id: "c",
  label: "Code",
  type: "code",
  codes: [
    { value: "AB", label: "Absent" },
    { value: "NA", label: "Not applicable" },
  ],
};

describe("validateCell: number", () => {
  it("accepts Bangla digits and returns ASCII", () => {
    expect(validateCell(marks, "৮৫")).toEqual({ ok: true, value: "85" });
    expect(validateCell(marks, "৮৫.৫")).toEqual({ ok: true, value: "85.5" });
  });

  it("accepts ASCII digits and trims spaces", () => {
    expect(validateCell(marks, " 7 ")).toEqual({ ok: true, value: "7" });
  });

  it("rejects text, below min and above max with translatable errors", () => {
    expect(validateCell(marks, "abc")).toMatchObject({
      ok: false,
      error: { key: "forms.error.invalidNumber" },
    });
    expect(validateCell(marks, "-1")).toMatchObject({
      ok: false,
      error: { key: "forms.error.min", params: { min: 0 } },
    });
    const over = validateCell(marks, "১০১");
    expect(over).toMatchObject({
      ok: false,
      error: { key: "forms.error.max", params: { max: 100 } },
    });
    if (!over.ok) expect(translateCellError(over.error)).toContain("১০০");
  });

  it("empty means not entered unless the column is required", () => {
    expect(validateCell(marks, "  ")).toEqual({ ok: true, value: "" });
    expect(validateCell({ ...marks, required: true }, "")).toMatchObject({
      ok: false,
      error: { key: "forms.error.required" },
    });
  });

  it("can reject decimals", () => {
    expect(validateCell({ ...marks, integer: true }, "8.5")).toMatchObject({
      ok: false,
      error: { key: "forms.error.integer" },
    });
  });
});

describe("validateCell: code and text", () => {
  it("matches a code without regard to case and returns the canonical form", () => {
    expect(validateCell(code, "ab")).toEqual({ ok: true, value: "AB" });
    expect(validateCell(code, "xx")).toMatchObject({
      ok: false,
      error: { key: "entryGrid.error.code", params: { codes: "AB, NA" } },
    });
  });

  it("limits text length by characters a person sees, not code points", () => {
    const text: EntryColumn = { id: "t", label: "Note", type: "text", maxLength: 3 };
    expect(validateCell(text, "ক্ষি")).toMatchObject({ ok: true });
    expect(validateCell(text, "abcd")).toMatchObject({
      ok: false,
      error: { key: "forms.error.tooLong", params: { max: 3 } },
    });
  });

  it("translates every error key it can return in both languages", () => {
    for (const lang of ["bn", "en"] as const) {
      setLocale(lang);
      const errors: CellError[] = [
        { key: "entryGrid.error.code", params: { codes: "AB" } },
        { key: "forms.error.min", params: { min: 0 } },
      ];
      for (const error of errors) expect(translateCellError(error)).not.toBe(error.key);
    }
  });
});
