import { Button, StickyActionBar } from "@sms/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { formatNumber } from "../format";
import { useT } from "../i18n";

import { translateCellError } from "./cell";
import { CellInput } from "./CellInput";
import { SaveStateIndicator } from "./SaveStateIndicator";
import type { EntryColumn, EntryGridProps } from "./types";
import type { EntryGridApi } from "./useEntryGrid";

const LIST_ROW = 72;

type Props = Pick<EntryGridProps, "label" | "columns" | "rows" | "activeColumnId"> & {
  grid: EntryGridApi;
};

/** Keeps the keyboard open: pressing the button must not take focus away from the field. */
const keepFocus = { onMouseDown: (e: { preventDefault: () => void }) => e.preventDefault() };

/**
 * Phone layout (360 px, touch only). One active column: a list of students with one numeric
 * field each, Enter or Next moves down, and a progress line. Several columns: one focused-cell
 * editor with Previous and Next. The bar with Next sits above the on-screen keyboard.
 */
export function PhoneLayout(props: Props) {
  const { columns, activeColumnId } = props;
  const single = columns.length === 1 ? columns[0] : columns.find((c) => c.id === activeColumnId);
  return single ? <ColumnList {...props} column={single} /> : <CellEditor {...props} />;
}

function ColumnList({ label, rows, grid, column }: Props & { column: EntryColumn }) {
  const t = useT();
  const uid = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const wantFocus = useRef<number | null>(null);
  const [current, setCurrent] = useState(0);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => LIST_ROW,
    overscan: 4,
    initialRect: { width: 360, height: 420 },
  });

  const moveTo = useCallback(
    (index: number) => {
      const i = Math.max(0, Math.min(rows.length - 1, index));
      wantFocus.current = i;
      setCurrent(i);
      virtualizer.scrollToIndex(i, { align: "center" });
    },
    [rows.length, virtualizer],
  );

  useEffect(() => {
    const target = wantFocus.current;
    if (target === null) return;
    const el = inputs.current.get(target);
    if (!el) return;
    wantFocus.current = null;
    el.focus();
    el.select();
  });

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, rowId: string, colId: string) => {
      if (e.key === "Enter") {
        e.preventDefault();
        grid.commit(rowId, colId);
        moveTo(rows.findIndex((r) => r.id === rowId) + 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        grid.revert(rowId, colId);
      }
    },
    [grid, rows, moveTo],
  );

  const onFocusCell = useCallback(
    (rowId: string) => {
      const i = rows.findIndex((r) => r.id === rowId);
      if (i >= 0) setCurrent(i);
    },
    [rows],
  );

  const entered = grid.enteredCount(column.id);
  const row = rows[current];
  const hint =
    column.type === "code" ? column.codes.map((c) => `${c.value} = ${c.label}`).join(", ") : "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="m-0 text-lg font-semibold">{column.label}</h3>
        {hint ? <p className="m-0 text-sm text-content-secondary">{hint}</p> : null}
      </div>
      <div
        ref={scrollRef}
        role="list"
        aria-label={label}
        data-testid="entry-list-scroll"
        className="relative overflow-auto rounded-md border border-line bg-surface"
        style={{ height: "min(60dvh, 30rem)", scrollPaddingBlock: LIST_ROW }}
      >
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const r = rows[item.index];
            if (!r) return null;
            const error = grid.errorOf(r.id, column.id);
            return (
              <div
                key={r.id}
                role="listitem"
                data-testid="entry-list-row"
                className={`absolute left-0 flex w-full items-center gap-3 border-b border-line px-3 ${
                  item.index === current ? "bg-surface-subtle" : "bg-surface"
                }`}
                style={{ top: item.start, height: LIST_ROW }}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 break-words font-medium">{r.label}</span>
                  <SaveStateIndicator state={grid.stateOf(r.id)} />
                </div>
                <div className="w-28 shrink-0">
                  <CellInput
                    id={`${uid}-${item.index}`}
                    rowId={r.id}
                    column={column}
                    value={grid.valueOf(r, column.id)}
                    error={error ? translateCellError(error) : undefined}
                    label={t("entryGrid.cell.label", { row: r.label, column: column.label })}
                    enterKeyHint="next"
                    className="text-end"
                    inputRef={(el) => {
                      if (el) inputs.current.set(item.index, el);
                      else inputs.current.delete(item.index);
                    }}
                    onType={grid.type}
                    onCommit={grid.commit}
                    onFocusCell={onFocusCell}
                    onKeyDown={onKeyDown}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <FieldError grid={grid} rows={rows} columns={[column]} rowId={row?.id} colId={column.id} />
      <StickyActionBar ariaLabel={t("entryGrid.phone.barLabel")}>
        <p
          className="m-0 me-auto self-center text-base font-medium"
          role="status"
          data-testid="entry-progress"
        >
          {t("entryGrid.phone.progress", {
            done: formatNumber(entered),
            total: formatNumber(rows.length),
          })}
        </p>
        <Button
          {...keepFocus}
          onClick={() => {
            if (row) grid.commit(row.id, column.id);
            moveTo(current + 1);
          }}
        >
          {t("entryGrid.phone.next")}
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Button>
      </StickyActionBar>
    </div>
  );
}

function CellEditor({ rows, columns, grid }: Props) {
  const t = useT();
  const uid = useId();
  const input = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState(0);
  const total = rows.length * columns.length;
  const r = Math.floor(pos / columns.length);
  const c = pos % columns.length;
  const row = rows[r];
  const col = columns[c];

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, [pos]);

  if (!row || !col) return null;

  const go = (next: number) => {
    grid.commit(row.id, col.id);
    setPos(Math.max(0, Math.min(total - 1, next)));
  };
  const error = grid.errorOf(row.id, col.id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="m-0 text-lg font-semibold">{row.label}</h3>
        <SaveStateIndicator state={grid.stateOf(row.id)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-cell`} className="text-sm font-medium">
          {col.label}
        </label>
        <CellInput
          id={`${uid}-cell`}
          rowId={row.id}
          column={col}
          value={grid.valueOf(row, col.id)}
          error={error ? translateCellError(error) : undefined}
          label={t("entryGrid.cell.label", { row: row.label, column: col.label })}
          enterKeyHint="next"
          className="text-lg"
          inputRef={input}
          onType={grid.type}
          onCommit={grid.commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              go(pos + 1);
            }
          }}
        />
        {col.type === "code" ? (
          <p className="m-0 text-sm text-content-secondary">
            {col.codes.map((x) => `${x.value} = ${x.label}`).join(", ")}
          </p>
        ) : null}
      </div>
      <FieldError grid={grid} rows={rows} columns={columns} rowId={row.id} colId={col.id} />
      <div
        role="group"
        aria-label={t("entryGrid.phone.rowSummary", { row: row.label })}
        className="flex flex-wrap gap-2"
      >
        {columns.map((x, i) => (
          <button
            key={x.id}
            type="button"
            {...keepFocus}
            aria-current={i === c ? "true" : undefined}
            onClick={() => go(r * columns.length + i)}
            className={`min-h-tap min-w-tap rounded-md border px-3 text-start ${
              i === c
                ? "border-2 border-primary bg-surface-subtle"
                : "border-line-strong bg-surface"
            }`}
          >
            <span className="block text-sm text-content-secondary">{x.label}</span>
            <span className="block text-base font-medium">{grid.valueOf(row, x.id) || "–"}</span>
          </button>
        ))}
      </div>
      <StickyActionBar ariaLabel={t("entryGrid.phone.barLabel")}>
        <p
          className="m-0 me-auto self-center text-base font-medium"
          role="status"
          data-testid="entry-progress"
        >
          {t("entryGrid.phone.cellProgress", {
            n: formatNumber(pos + 1),
            total: formatNumber(total),
          })}
        </p>
        <Button
          variant="secondary"
          {...keepFocus}
          disabled={pos === 0}
          onClick={() => go(pos - 1)}
          leadingIcon={<ChevronLeft aria-hidden className="h-4 w-4" />}
        >
          {t("entryGrid.phone.previous")}
        </Button>
        <Button {...keepFocus} disabled={pos === total - 1} onClick={() => go(pos + 1)}>
          {t("entryGrid.phone.next")}
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Button>
      </StickyActionBar>
    </div>
  );
}

function FieldError({
  grid,
  rows,
  columns,
  rowId,
  colId,
}: {
  grid: EntryGridApi;
  rows: Props["rows"];
  columns: EntryColumn[];
  rowId: string | undefined;
  colId: string;
}) {
  const t = useT();
  const error = rowId ? grid.errorOf(rowId, colId) : undefined;
  const row = rows.find((r) => r.id === rowId);
  const col = columns.find((c) => c.id === colId);
  return (
    <div className="min-h-6 text-sm" aria-live="polite" data-testid="entry-grid-message">
      {error && row && col ? (
        <span className="font-medium text-danger">
          <span aria-hidden="true">⚠ </span>
          <span className="sr-only">{t("common.state.error")}: </span>
          {row.label}: {translateCellError(error)}
        </span>
      ) : null}
    </div>
  );
}
