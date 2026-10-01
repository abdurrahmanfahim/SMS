import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useT } from "../i18n";

import { translateCellError } from "./cell";
import { CellInput } from "./CellInput";
import { SaveStateIndicator } from "./SaveStateIndicator";
import type { EntryGridProps } from "./types";
import type { EntryGridApi } from "./useEntryGrid";

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 48;
const NAME_WIDTH = 168;
const STATUS_WIDTH = 124;
const DEFAULT_WIDTH = 96;

type Props = Pick<
  EntryGridProps,
  "label" | "rowHeader" | "statusHeader" | "columns" | "rows" | "height"
> & {
  grid: EntryGridApi;
};

/**
 * Keyboard-first grid for desktop and tablets: rows are students, columns are fields. One field
 * is a tab stop (roving tabindex): arrows move, Tab and Shift+Tab move cell to cell, Enter saves
 * and moves down, Escape throws away what was typed. The header and the name column are sticky;
 * scroll padding keeps the focused cell clear of both.
 */
export function GridLayout({ label, rowHeader, statusHeader, columns, rows, height, grid }: Props) {
  const t = useT();
  const uid = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const wantFocus = useRef(false);
  const [active, setActive] = useState({ r: 0, c: 0 });
  const [announce, setAnnounce] = useState<{ rowId: string; colId: string } | null>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
    // The sticky header covers the top of the scroll area; keep scrolled-to rows below it.
    scrollPaddingStart: HEADER_HEIGHT,
    initialRect: { width: 1024, height: 560 },
  });
  const items = virtualizer.getVirtualItems();

  const widths = useMemo(() => columns.map((c) => c.width ?? DEFAULT_WIDTH), [columns]);
  const template = `${NAME_WIDTH}px ${widths.map((w) => `${w}px`).join(" ")} ${STATUS_WIDTH}px`;
  const totalWidth = NAME_WIDTH + widths.reduce((a, b) => a + b, 0) + STATUS_WIDTH;

  const key = (r: number, c: number) => `${r}:${c}`;

  const moveTo = useCallback(
    (r: number, c: number) => {
      const nr = Math.max(0, Math.min(rows.length - 1, r));
      const nc = Math.max(0, Math.min(columns.length - 1, c));
      wantFocus.current = true;
      setActive({ r: nr, c: nc });
      virtualizer.scrollToIndex(nr, { align: "auto" });
    },
    [rows.length, columns.length, virtualizer],
  );

  // Focus the active cell once it is in the DOM (it may have just been scrolled into the window).
  useEffect(() => {
    if (!wantFocus.current) return;
    const el = inputs.current.get(key(active.r, active.c));
    if (!el) return;
    wantFocus.current = false;
    el.focus();
    el.select();
  });

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, rowId: string, colId: string) => {
      const r = rows.findIndex((x) => x.id === rowId);
      const c = columns.findIndex((x) => x.id === colId);
      const el = e.currentTarget;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          grid.commit(rowId, colId);
          moveTo(r + 1, c);
          break;
        case "ArrowUp":
          e.preventDefault();
          grid.commit(rowId, colId);
          moveTo(r - 1, c);
          break;
        case "ArrowLeft":
          if (el.selectionStart === 0 && el.selectionEnd === 0) {
            e.preventDefault();
            grid.commit(rowId, colId);
            moveTo(r, c - 1);
          }
          break;
        case "ArrowRight":
          if (el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
            e.preventDefault();
            grid.commit(rowId, colId);
            moveTo(r, c + 1);
          }
          break;
        case "Enter":
          e.preventDefault();
          grid.commit(rowId, colId);
          setAnnounce({ rowId, colId });
          moveTo(r + 1, c);
          break;
        case "Escape":
          e.preventDefault();
          grid.revert(rowId, colId);
          el.select();
          break;
        case "Tab": {
          const lastCell = r === rows.length - 1 && c === columns.length - 1;
          const firstCell = r === 0 && c === 0;
          if (e.shiftKey ? firstCell : lastCell) break; // let focus leave the grid
          e.preventDefault();
          grid.commit(rowId, colId);
          const flat = r * columns.length + c + (e.shiftKey ? -1 : 1);
          moveTo(Math.floor(flat / columns.length), flat % columns.length);
          break;
        }
      }
    },
    [rows, columns, grid, moveTo],
  );

  const onFocusCell = useCallback(
    (rowId: string, colId: string) => {
      const r = rows.findIndex((x) => x.id === rowId);
      const c = columns.findIndex((x) => x.id === colId);
      if (r >= 0 && c >= 0) setActive((a) => (a.r === r && a.c === c ? a : { r, c }));
    },
    [rows, columns],
  );

  const activeRow = rows[active.r];
  const activeCol = columns[active.c];
  const activeError = activeRow && activeCol ? grid.errorOf(activeRow.id, activeCol.id) : undefined;
  const lastCommitted = announce ? grid.stateOf(announce.rowId) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={scrollRef}
        data-testid="entry-grid-scroll"
        className="relative overflow-auto rounded-md border border-line bg-surface"
        style={{
          height: height ?? "min(70vh, 34rem)",
          // Browser focus scrolling stops short of the sticky header and the sticky name column.
          scrollPaddingTop: HEADER_HEIGHT,
          scrollPaddingLeft: NAME_WIDTH,
        }}
      >
        <div
          role="grid"
          aria-label={label}
          aria-rowcount={rows.length + 1}
          aria-colcount={columns.length + 2}
          style={{ minWidth: totalWidth }}
        >
          <div role="rowgroup" className="sticky top-0 z-20" style={{ height: HEADER_HEIGHT }}>
            <div
              role="row"
              aria-rowindex={1}
              className="grid border-b border-line-strong bg-surface-subtle font-medium"
              style={{ gridTemplateColumns: template, height: HEADER_HEIGHT }}
            >
              <div
                role="columnheader"
                aria-colindex={1}
                className="sticky left-0 z-10 flex items-center border-e border-line bg-surface-subtle px-3"
              >
                <span className="truncate">{rowHeader}</span>
              </div>
              {columns.map((col, i) => (
                <div
                  key={col.id}
                  role="columnheader"
                  aria-colindex={i + 2}
                  className="flex items-center px-2"
                >
                  <span className="truncate">{col.label}</span>
                </div>
              ))}
              <div
                role="columnheader"
                aria-colindex={columns.length + 2}
                className="flex items-center px-2"
              >
                <span className="truncate">{statusHeader}</span>
              </div>
            </div>
          </div>
          <div role="rowgroup" className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {items.map((item) => {
              const row = rows[item.index];
              if (!row) return null;
              return (
                <div
                  key={row.id}
                  role="row"
                  aria-rowindex={item.index + 2}
                  data-testid="entry-grid-row"
                  className="absolute left-0 grid border-b border-line bg-surface"
                  style={{
                    top: item.start,
                    height: ROW_HEIGHT,
                    width: "100%",
                    gridTemplateColumns: template,
                  }}
                >
                  <div
                    role="rowheader"
                    aria-colindex={1}
                    className="sticky left-0 z-10 flex min-w-0 items-center border-e border-line bg-surface px-3"
                  >
                    <span className="line-clamp-2 break-words">{row.label}</span>
                  </div>
                  {columns.map((col, c) => {
                    const error = grid.errorOf(row.id, col.id);
                    const isActive = active.r === item.index && active.c === c;
                    return (
                      <div
                        key={col.id}
                        role="gridcell"
                        aria-colindex={c + 2}
                        className="flex items-center px-1.5"
                      >
                        <CellInput
                          id={`${uid}-${item.index}-${c}`}
                          rowId={row.id}
                          column={col}
                          value={grid.valueOf(row, col.id)}
                          error={error ? translateCellError(error) : undefined}
                          label={t("entryGrid.cell.label", { row: row.label, column: col.label })}
                          tabIndex={isActive ? 0 : -1}
                          enterKeyHint="next"
                          inputRef={(el) => {
                            const k = key(item.index, c);
                            if (el) inputs.current.set(k, el);
                            else inputs.current.delete(k);
                          }}
                          onType={grid.type}
                          onCommit={grid.commit}
                          onFocusCell={onFocusCell}
                          onKeyDown={onKeyDown}
                        />
                      </div>
                    );
                  })}
                  <div
                    role="gridcell"
                    aria-colindex={columns.length + 2}
                    className="flex items-center px-2"
                  >
                    <SaveStateIndicator state={grid.stateOf(row.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="min-h-6 text-sm" aria-live="polite" data-testid="entry-grid-message">
        {activeError && activeRow && activeCol ? (
          <span className="font-medium text-danger">
            <span aria-hidden="true">⚠ </span>
            <span className="sr-only">{t("common.state.error")}: </span>
            {activeRow.label}, {activeCol.label}: {translateCellError(activeError)}
          </span>
        ) : lastCommitted?.status === "error" ? (
          <span className="font-medium text-danger">{t("entryGrid.grid.saveFailed")}</span>
        ) : (
          <span className="text-content-secondary">{t("entryGrid.grid.keyboardHint")}</span>
        )}
      </div>
    </div>
  );
}
