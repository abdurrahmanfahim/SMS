/** A code a cell may hold instead of a number, for example `AB` for absent. */
export interface CodeOption {
  /** Canonical value sent to `onCellCommit` (compared case-insensitively while typing). */
  value: string;
  /** Translated name, shown as a hint. */
  label: string;
}

interface BaseColumn {
  id: string;
  /** Translated column name. */
  label: string;
  /** Width in px on the grid layout. Default 96. */
  width?: number;
  /** An empty cell is an error. Default false: empty means "not entered". */
  required?: boolean;
}

export interface NumberColumn extends BaseColumn {
  type: "number";
  min?: number;
  max?: number;
  /** Reject decimals. */
  integer?: boolean;
}

export interface CodeColumn extends BaseColumn {
  type: "code";
  codes: CodeOption[];
}

export interface TextColumn extends BaseColumn {
  type: "text";
  maxLength?: number;
}

export type EntryColumn = NumberColumn | CodeColumn | TextColumn;

export interface EntryRow {
  id: string;
  /** Translated row name (student name). Shown in the sticky first column. */
  label: string;
  /** Saved values by column id, always ASCII text. Missing means not entered. */
  values: Record<string, string>;
}

/** What the indicator shows for one row. M2-E2 feeds this from the offline queue. */
export type RowSaveState =
  | { status: "saved" }
  | { status: "saving" }
  | { status: "pending"; count: number }
  | { status: "error" };

/** A cell problem as an i18n key plus parameters, so the text follows the language switch. */
export interface CellError {
  key: string;
  params?: Record<string, string | number>;
}

export type CellResult = { ok: true; value: string } | { ok: false; error: CellError };

export interface EntryGridProps {
  /** Accessible name of the grid (for example "Marks, class 6, Mathematics"). */
  label: string;
  /** Header text of the first column (for example "Student"). */
  rowHeader: string;
  /** Header text of the save-state column. */
  statusHeader: string;
  columns: EntryColumn[];
  rows: EntryRow[];
  /**
   * Called once per valid, changed cell with the normalised value (ASCII digits; `""` when the
   * cell was cleared). Resolve when saved; reject to show the Error state. The grid keeps the
   * typed value on rejection so the person can retry.
   */
  onCellCommit: (rowId: string, colId: string, value: string) => Promise<void>;
  /**
   * Save state per row. Optional: without it the grid derives Saving, Saved and Error from the
   * promises returned by `onCellCommit`. When a row is present here it wins, which is how the
   * offline queue shows Pending n.
   */
  saveState?: Record<string, RowSaveState | undefined>;
  /** Phone only: fill this one column for the whole class (list mode). */
  activeColumnId?: string;
  /** Force a layout. Default "auto": phone layout below 768 px. */
  layout?: "auto" | "grid" | "phone";
  /** Height of the scroll area on the grid layout (CSS length). Default `min(70vh, 34rem)`. */
  height?: string;
}
