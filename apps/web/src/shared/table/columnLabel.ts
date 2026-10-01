import type { Column } from "@tanstack/react-table";

/** Human name of a column: `meta.label`, else a string header, else the column id. */
export function columnLabel<T>(column: Column<T, unknown>): string {
  const meta = column.columnDef.meta;
  if (meta?.label) return meta.label;
  const header = column.columnDef.header;
  return typeof header === "string" ? header : column.id;
}
