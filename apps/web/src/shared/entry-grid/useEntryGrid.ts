import { useCallback, useMemo, useReducer, useRef } from "react";

import { validateCell } from "./cell";
import type { CellError, EntryGridProps, EntryRow, RowSaveState } from "./types";

type ByRow<T> = Record<string, Record<string, T> | undefined>;
interface Overlay {
  value: string;
  /** What `rows` held when this was saved. If `rows` changes, the new value wins. */
  base: string;
}
interface Activity {
  saving: number;
  failed: boolean;
}

interface State {
  /** What the person typed and has not saved (or whose save failed). */
  drafts: ByRow<string>;
  /** Saves in flight. */
  inflight: ByRow<string>;
  /** Saved values, on top of `rows` until `rows` catches up. */
  saved: ByRow<Overlay>;
  errors: ByRow<CellError>;
  activity: Record<string, Activity | undefined>;
}

type Action =
  | { type: "draft"; row: string; col: string; value: string }
  | { type: "invalid"; row: string; col: string; error: CellError }
  | { type: "revert"; row: string; col: string }
  | { type: "start"; row: string; col: string; value: string }
  | { type: "ok"; row: string; col: string; value: string; base: string }
  | { type: "fail"; row: string; col: string; value: string };

function setCell<T>(map: ByRow<T>, row: string, col: string, value: T | undefined): ByRow<T> {
  const next = { ...map[row] } as Record<string, T>;
  if (value === undefined) delete next[col];
  else next[col] = value;
  return { ...map, [row]: next };
}

function reducer(state: State, action: Action): State {
  const { row, col } = action;
  const act = state.activity[row] ?? { saving: 0, failed: false };
  switch (action.type) {
    case "draft":
      return {
        ...state,
        drafts: setCell(state.drafts, row, col, action.value),
        errors: setCell(state.errors, row, col, undefined),
      };
    case "invalid":
      return { ...state, errors: setCell(state.errors, row, col, action.error) };
    case "revert":
      return {
        ...state,
        drafts: setCell(state.drafts, row, col, undefined),
        errors: setCell(state.errors, row, col, undefined),
      };
    case "start":
      return {
        ...state,
        drafts: setCell(state.drafts, row, col, undefined),
        errors: setCell(state.errors, row, col, undefined),
        inflight: setCell(state.inflight, row, col, action.value),
        activity: { ...state.activity, [row]: { saving: act.saving + 1, failed: false } },
      };
    case "ok":
      return {
        ...state,
        inflight: setCell(state.inflight, row, col, undefined),
        saved: setCell(state.saved, row, col, { value: action.value, base: action.base }),
        activity: { ...state.activity, [row]: { ...act, saving: Math.max(0, act.saving - 1) } },
      };
    case "fail":
      return {
        ...state,
        inflight: setCell(state.inflight, row, col, undefined),
        // The typed value stays in the cell so the person can retry.
        drafts: setCell(state.drafts, row, col, action.value),
        activity: {
          ...state.activity,
          [row]: { saving: Math.max(0, act.saving - 1), failed: true },
        },
      };
  }
}

const INITIAL: State = { drafts: {}, inflight: {}, saved: {}, errors: {}, activity: {} };

export interface EntryGridApi {
  /** The text to show in a cell. */
  valueOf: (row: EntryRow, colId: string) => string;
  /** True when the cell shows something not saved yet. */
  isDirty: (rowId: string, colId: string) => boolean;
  errorOf: (rowId: string, colId: string) => CellError | undefined;
  stateOf: (rowId: string) => RowSaveState | undefined;
  type: (rowId: string, colId: string, raw: string) => void;
  /** Validates the typed text and saves it. Safe to call twice; the second call does nothing. */
  commit: (rowId: string, colId: string) => void;
  /** Throws away the typed text (Escape). */
  revert: (rowId: string, colId: string) => void;
  /** Number of rows with a value in the column. */
  enteredCount: (colId: string) => number;
  drafts: State["drafts"];
  errors: State["errors"];
}

/** State and rules shared by the grid layout and the phone layout. */
export function useEntryGrid(
  props: Pick<EntryGridProps, "columns" | "rows" | "onCellCommit" | "saveState">,
): EntryGridApi {
  const { columns, rows, onCellCommit, saveState } = props;
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const live = useRef({ state, rows, columns, onCellCommit });
  live.current = { state, rows, columns, onCellCommit };

  const rowIndex = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const baseValue = useCallback((row: EntryRow, colId: string) => row.values[colId] ?? "", []);
  const valueOf = useCallback(
    (row: EntryRow, colId: string): string => {
      const draft = state.drafts[row.id]?.[colId];
      if (draft !== undefined) return draft;
      const inflight = state.inflight[row.id]?.[colId];
      if (inflight !== undefined) return inflight;
      const base = baseValue(row, colId);
      const overlay = state.saved[row.id]?.[colId];
      return overlay && overlay.base === base ? overlay.value : base;
    },
    [state, baseValue],
  );

  const type = useCallback((row: string, col: string, value: string) => {
    dispatch({ type: "draft", row, col, value });
  }, []);

  const revert = useCallback((row: string, col: string) => {
    dispatch({ type: "revert", row, col });
  }, []);

  const commit = useCallback((rowId: string, col: string) => {
    const { state: s, rows: rs, columns: cs, onCellCommit: save } = live.current;
    const draft = s.drafts[rowId]?.[col];
    if (draft === undefined) return;
    const column = cs.find((c) => c.id === col);
    const row = rs.find((r) => r.id === rowId);
    if (!column || !row) return;
    const result = validateCell(column, draft);
    if (!result.ok) {
      dispatch({ type: "invalid", row: rowId, col, error: result.error });
      return;
    }
    const base = row.values[col] ?? "";
    const overlay = s.saved[rowId]?.[col];
    const current = overlay && overlay.base === base ? overlay.value : base;
    if (result.value === current) {
      dispatch({ type: "revert", row: rowId, col });
      return;
    }
    dispatch({ type: "start", row: rowId, col, value: result.value });
    save(rowId, col, result.value).then(
      () => dispatch({ type: "ok", row: rowId, col, value: result.value, base }),
      () => dispatch({ type: "fail", row: rowId, col, value: result.value }),
    );
  }, []);

  const stateOf = useCallback(
    (rowId: string): RowSaveState | undefined => {
      const given = saveState?.[rowId];
      if (given) return given;
      const act = state.activity[rowId];
      if (!act) return undefined;
      if (act.failed) return { status: "error" };
      if (act.saving > 0) return { status: "saving" };
      return { status: "saved" };
    },
    [saveState, state.activity],
  );

  const enteredCount = useCallback(
    (colId: string) => {
      let n = 0;
      for (const row of rowIndex.values()) if (valueOf(row, colId) !== "") n++;
      return n;
    },
    [rowIndex, valueOf],
  );

  return {
    valueOf,
    isDirty: (rowId, colId) => state.drafts[rowId]?.[colId] !== undefined,
    errorOf: (rowId, colId) => state.errors[rowId]?.[colId],
    stateOf,
    type,
    commit,
    revert,
    enteredCount,
    drafts: state.drafts,
    errors: state.errors,
  };
}
