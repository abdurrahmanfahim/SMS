import type { RowData } from "@tanstack/react-table";

export interface FilterOption {
  value: string;
  /** Already translated by the caller. */
  label: string;
}

/** How a column is filtered in the filter panel. */
export type ColumnFilter = { type: "text" } | { type: "select"; options: FilterOption[] };

/** Where a column appears in the phone card layout. */
export type CardRole = "title" | "subtitle" | "meta" | "trailing" | "hidden";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Place in the card layout. Default: first column is the title, the next three are meta lines. */
    card?: CardRole;
    /** Adds a filter control for this column to the filter panel. */
    filter?: ColumnFilter;
    /** Translated name used in the panels and the sort list. Defaults to a string header. */
    label?: string;
    /** Right-align (numbers, money). */
    align?: "start" | "end";
  }
}

/** What a server-side list endpoint needs, produced by `useTableState`. */
export interface ServerTableParams {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  sort: Array<{ id: string; desc: boolean }>;
  /** Debounced search text. */
  search: string;
  /** Column filters, only the non-empty ones. */
  filters: Record<string, string>;
}
