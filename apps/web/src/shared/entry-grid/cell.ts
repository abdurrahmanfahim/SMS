import { formatNumber } from "../format";
import { cleanNumericText, parseNumericInput } from "../forms/digits";
import { t } from "../i18n";

import type { CellError, CellResult, EntryColumn } from "./types";

const err = (key: string, params?: CellError["params"]): CellResult => ({
  ok: false,
  error: { key, params },
});

/**
 * Checks what a person typed into one cell and returns the normalised value to save.
 * Bangla digits become ASCII; a code is matched without regard to case and returned in its
 * canonical form; an empty cell is valid unless the column is required.
 */
export function validateCell(column: EntryColumn, raw: string): CellResult {
  if (column.type === "number") {
    if (cleanNumericText(raw) === "") {
      return column.required ? err("forms.error.required") : { ok: true, value: "" };
    }
    const parsed = parseNumericInput(raw);
    if (!parsed.ok) return err("forms.error.invalidNumber");
    if (column.integer && !Number.isInteger(parsed.value)) return err("forms.error.integer");
    if (column.min !== undefined && parsed.value < column.min)
      return err("forms.error.min", { min: column.min });
    if (column.max !== undefined && parsed.value > column.max)
      return err("forms.error.max", { max: column.max });
    return { ok: true, value: String(parsed.value) };
  }
  const text = raw.trim();
  if (text === "") return column.required ? err("forms.error.required") : { ok: true, value: "" };
  if (column.type === "code") {
    const found = column.codes.find((c) => c.value.toLowerCase() === text.toLowerCase());
    return found
      ? { ok: true, value: found.value }
      : err("entryGrid.error.code", { codes: column.codes.map((c) => c.value).join(", ") });
  }
  if (column.maxLength !== undefined && [...text].length > column.maxLength)
    return err("forms.error.tooLong", { max: column.maxLength });
  return { ok: true, value: text };
}

/** Turns a cell error into text in the current language (numbers shown in the user's digits). */
export function translateCellError(error: CellError): string {
  const params: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(error.params ?? {})) {
    params[name] =
      (name === "min" || name === "max") && typeof value === "number" ? formatNumber(value) : value;
  }
  return t(error.key, params);
}

/** Text typed into a cell: Bangla digits are turned into ASCII on the way in (length unchanged). */
export { asciiWhileTyping as cleanTyping } from "../forms/digits";
