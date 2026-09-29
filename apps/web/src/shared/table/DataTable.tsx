import { Button, EmptyState, ErrorState, Input, Select, Skeleton } from "@sms/ui";
import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";

import { formatNumber } from "../format";
import { useControllable } from "../hooks/useControllable";
import { useIsPhone } from "../hooks/useMediaQuery";
import { useT } from "../i18n";

import { columnLabel } from "./columnLabel";
import { FilterSheet } from "./FilterSheet";
import { Pagination } from "./Pagination";
import { toColumnFilters } from "./useTableState";

const SELECT_ID = "__select";
const DEFAULT_TABLE_ROW_HEIGHT = 52;
const CARD_HEIGHT = 112;
const CARD_GAP = 8;

export interface DataTableProps<T> {
  /** Accessible name of the table (translated). */
  label: string;
  columns: ColumnDef<T, never>[] | ColumnDef<T, unknown>[] | ColumnDef<T>[];
  data: T[];
  getRowId: (row: T) => string;
  /** Accessible name of a row: used for checkboxes and the card button. Default: first cell text. */
  getRowLabel?: (row: T) => string;

  /**
   * Total number of rows on the server. When set, the table is in **server mode**: sorting,
   * filtering and paging are done by the caller (`manual*`), and `data` is just the current page.
   * When absent, all of that happens in the browser on `data` (fine up to some ten thousand rows
   * because rows are virtualised).
   */
  rowCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: (next: PaginationState) => void;
  pageSizeOptions?: number[];
  sorting?: SortingState;
  onSortingChange?: (next: SortingState) => void;
  /** Shows a search box when `onSearchChange` is given. */
  search?: string;
  onSearchChange?: (next: string) => void;
  /** Column filters as `{ columnId: value }`; columns opt in with `meta.filter`. */
  filters?: Record<string, string>;
  onFiltersChange?: (next: Record<string, string>) => void;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;

  /** Adds a checkbox column. Selection is by row id and survives paging. */
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  /** Bulk actions shown next to the "n selected" text. */
  renderSelectionActions?: (selectedIds: string[]) => ReactNode;

  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Shows the error state instead of rows. */
  error?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;

  /** "auto" (default): cards below 768 px, table above. */
  mode?: "auto" | "table" | "cards";
  /** Replaces the default card content. */
  renderCard?: (row: T) => ReactNode;
  /** Largest height of the scrolling area (CSS length). Default 70vh. */
  maxHeight?: string;
  rowHeight?: number;
}

/**
 * List component for every feature: sortable, filterable, pageable, selectable, virtualised, and
 * a card list on phones. Built on TanStack Table (v8) and TanStack Virtual.
 *
 * Text passed in (`label`, headers, empty texts) must already be translated. Numbers shown by the
 * table itself use `formatNumber`.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    label,
    columns,
    data,
    getRowId,
    getRowLabel,
    rowCount,
    pageSizeOptions,
    enableRowSelection = false,
    renderSelectionActions,
    onRowClick,
    loading = false,
    error = false,
    onRetry,
    emptyTitle,
    emptyDescription,
    mode = "auto",
    renderCard,
    maxHeight = "70vh",
    rowHeight = DEFAULT_TABLE_ROW_HEIGHT,
  } = props;
  const t = useT();
  const isPhone = useIsPhone();
  const cards = mode === "cards" || (mode === "auto" && isPhone);
  const serverMode = rowCount !== undefined;

  const [sorting, setSorting] = useControllable<SortingState>(
    props.sorting,
    props.onSortingChange,
    [],
  );
  const [pagination, setPagination] = useControllable<PaginationState>(
    props.pagination,
    props.onPaginationChange,
    { pageIndex: 0, pageSize: 25 },
  );
  const [search, setSearch] = useControllable<string>(props.search, props.onSearchChange, "");
  const [filters, setFilters] = useControllable<Record<string, string>>(
    props.filters,
    props.onFiltersChange,
    {},
  );
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const columnVisibility = props.columnVisibility ?? visibility;
  const onColumnVisibilityChange = props.onColumnVisibilityChange ?? setVisibility;
  const selection = props.rowSelection ?? rowSelection;
  const onRowSelectionChange = props.onRowSelectionChange ?? setRowSelection;
  const [panelOpen, setPanelOpen] = useState(false);

  const usePagination = props.pagination !== undefined;

  const allColumns = useMemo(() => {
    const base = (columns as ColumnDef<T>[]).map((column) => {
      const filter = column.meta?.filter;
      if (!filter || serverMode) return column;
      return {
        ...column,
        filterFn: filter.type === "select" ? "equalsString" : "includesString",
      } as ColumnDef<T>;
    });
    if (!enableRowSelection) return base;
    const selectColumn: ColumnDef<T> = {
      id: SELECT_ID,
      size: 56,
      enableSorting: false,
      enableHiding: false,
      meta: { card: "hidden" },
      header: () => null,
      cell: () => null,
    };
    return [selectColumn, ...base];
  }, [columns, enableRowSelection, serverMode]);

  const table = useReactTable<T>({
    data,
    columns: allColumns,
    getRowId,
    state: {
      sorting,
      globalFilter: search,
      columnFilters: toColumnFilters(filters),
      columnVisibility,
      rowSelection: selection,
      ...(usePagination ? { pagination } : {}),
    },
    onSortingChange: (u) => setSorting(u as never),
    onColumnVisibilityChange,
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    ...(serverMode
      ? { manualSorting: true, manualFiltering: true, manualPagination: true, rowCount }
      : {
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          ...(usePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
        }),
    enableRowSelection,
    enableMultiSort: false,
  });

  const rows = table.getRowModel().rows;
  const total = serverMode ? rowCount : table.getFilteredRowModel().rows.length;
  const visibleColumns = table.getVisibleLeafColumns();
  const dataColumns = visibleColumns.filter((c) => c.id !== SELECT_ID);
  const filterColumns = table.getAllLeafColumns().filter((c) => c.columnDef.meta?.filter);
  const hideableColumns = table
    .getAllLeafColumns()
    .filter((c) => c.id !== SELECT_ID && c.getCanHide());
  const activeFilters = Object.values(filters).filter((v) => v !== "").length;
  const selectedIds = Object.keys(selection).filter((id) => selection[id]);
  const rowOffset = serverMode && usePagination ? pagination.pageIndex * pagination.pageSize : 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const itemSize = cards ? CARD_HEIGHT + CARD_GAP : rowHeight;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemSize,
    overscan: 8,
    // Lets the first render show rows before the element has been measured.
    initialRect: { width: 360, height: 640 },
  });
  const items = virtualizer.getVirtualItems();

  const gridTemplate = visibleColumns
    .map((c) => (c.id === SELECT_ID ? "56px" : `minmax(${c.getSize()}px, 1fr)`))
    .join(" ");
  const minWidth = visibleColumns.reduce(
    (sum, c) => sum + (c.id === SELECT_ID ? 56 : c.getSize()),
    0,
  );

  const rowLabel = (row: Row<T>): string =>
    getRowLabel
      ? getRowLabel(row.original)
      : (row
          .getVisibleCells()
          .find((c) => c.column.id !== SELECT_ID)
          ?.getValue<string>()
          ?.toString() ?? "");

  const selectLabel = (row: Row<T>, index: number): string => {
    const name = rowLabel(row);
    return name
      ? t("table.select.row", { name })
      : t("table.select.rowFallback", { number: formatNumber(rowOffset + index + 1) });
  };

  const sortableColumns = dataColumns.filter((c) => c.getCanSort());
  const sortValue = sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}` : "";
  const showToolbar =
    props.onSearchChange !== undefined ||
    filterColumns.length > 0 ||
    hideableColumns.length > 0 ||
    (cards && sortableColumns.length > 0);

  function renderSelectCheckbox(row: Row<T>, index: number) {
    return (
      <label className="inline-flex min-h-tap min-w-tap items-center justify-center">
        <input
          type="checkbox"
          className="h-5 w-5"
          aria-label={selectLabel(row, index)}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      </label>
    );
  }

  function renderTableRow(row: Row<T>, index: number) {
    const cells = row.getVisibleCells();
    const firstDataId = cells.find((c) => c.column.id !== SELECT_ID)?.column.id;
    return cells.map((cell) => {
      const meta = cell.column.columnDef.meta;
      if (cell.column.id === SELECT_ID) {
        return (
          <div key={cell.id} role="cell" className="flex items-center justify-center">
            {renderSelectCheckbox(row, index)}
          </div>
        );
      }
      const content = flexRender(cell.column.columnDef.cell, cell.getContext());
      const text = cell.getValue();
      return (
        <div
          key={cell.id}
          role="cell"
          title={typeof text === "string" ? text : undefined}
          className={`flex min-w-0 items-center px-3 ${meta?.align === "end" ? "justify-end text-right" : ""}`}
        >
          {onRowClick && cell.column.id === firstDataId ? (
            <button
              type="button"
              className="min-h-tap min-w-0 max-w-full truncate text-left underline-offset-2 hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                onRowClick(row.original);
              }}
            >
              {content}
            </button>
          ) : (
            <span className="min-w-0 truncate">{content}</span>
          )}
        </div>
      );
    });
  }

  function renderCardBody(row: Row<T>) {
    if (renderCard) return renderCard(row.original);
    const roleOf = (id: string, position: number) =>
      table.getColumn(id)?.columnDef.meta?.card ??
      (position === 0 ? "title" : position <= 3 ? "meta" : "hidden");
    const cells = row.getVisibleCells().filter((c) => c.column.id !== SELECT_ID);
    const pick = (role: string) => cells.filter((c, i) => roleOf(c.column.id, i) === role);
    const show = (cell: (typeof cells)[number]) =>
      flexRender(cell.column.columnDef.cell, cell.getContext());
    const title = pick("title")[0];
    const subtitle = pick("subtitle")[0];
    const meta = pick("meta").slice(0, 3);
    const trailing = pick("trailing")[0];
    return (
      <>
        <div className="min-w-0 flex-1 text-left">
          {title ? <div className="truncate font-semibold">{show(title)}</div> : null}
          {subtitle ? <div className="truncate text-sm">{show(subtitle)}</div> : null}
          {meta.map((cell) => (
            <div key={cell.id} className="truncate text-sm text-content-secondary">
              {show(cell)}
            </div>
          ))}
        </div>
        {trailing ? <div className="shrink-0">{show(trailing)}</div> : null}
      </>
    );
  }

  const body = (() => {
    if (error) {
      return (
        <ErrorState
          title={t("table.state.errorTitle")}
          description={t("table.state.errorDescription")}
          action={onRetry ? <Button onClick={onRetry}>{t("table.state.retry")}</Button> : undefined}
        />
      );
    }
    if (loading) {
      return <Skeleton label={t("table.state.loading")} lines={6} className="h-10" />;
    }
    if (rows.length === 0) {
      return (
        <EmptyState
          title={emptyTitle ?? t("table.state.emptyTitle")}
          description={emptyDescription ?? t("table.state.emptyDescription")}
        />
      );
    }
    if (cards) {
      return (
        <div
          ref={scrollRef}
          className="overflow-auto"
          style={{ maxHeight }}
          data-testid="table-scroll"
        >
          <ul
            aria-label={label}
            className="relative m-0 list-none p-0"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {items.map((item) => {
              const row = rows[item.index];
              if (!row) return null;
              const selected = row.getIsSelected();
              return (
                <li
                  key={row.id}
                  className="absolute inset-x-0 flex items-stretch gap-2"
                  style={{ top: item.start, height: CARD_HEIGHT }}
                  data-testid="table-card"
                >
                  {enableRowSelection ? (
                    <div className="flex items-center">{renderSelectCheckbox(row, item.index)}</div>
                  ) : null}
                  {onRowClick ? (
                    <button
                      type="button"
                      onClick={() => onRowClick(row.original)}
                      aria-label={undefined}
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg border bg-surface-raised p-4 text-left shadow-sm ${
                        selected ? "border-2 border-primary" : "border-line"
                      }`}
                    >
                      {renderCardBody(row)}
                    </button>
                  ) : (
                    <div
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg border bg-surface-raised p-4 shadow-sm ${
                        selected ? "border-2 border-primary" : "border-line"
                      }`}
                    >
                      {renderCardBody(row)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    return (
      <div
        ref={scrollRef}
        className="overflow-auto rounded-lg border border-line"
        style={{ maxHeight }}
        data-testid="table-scroll"
      >
        <div
          role="table"
          aria-label={label}
          aria-rowcount={total + 1}
          aria-colcount={visibleColumns.length}
          style={{ minWidth }}
        >
          <div role="rowgroup" className="sticky top-0 z-sticky bg-surface-subtle">
            <div
              role="row"
              aria-rowindex={1}
              className="grid border-b border-line font-medium"
              style={{ gridTemplateColumns: gridTemplate, minHeight: 48 }}
            >
              {table.getHeaderGroups()[0]?.headers.map((header) => {
                const column = header.column;
                if (column.id === SELECT_ID) {
                  return (
                    <div
                      key={header.id}
                      role="columnheader"
                      className="flex items-center justify-center"
                    >
                      <label className="inline-flex min-h-tap min-w-tap items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          aria-label={t("table.select.all")}
                          checked={table.getIsAllPageRowsSelected()}
                          ref={(el) => {
                            if (el) el.indeterminate = table.getIsSomePageRowsSelected();
                          }}
                          onChange={table.getToggleAllPageRowsSelectedHandler()}
                        />
                      </label>
                    </div>
                  );
                }
                const sorted = column.getIsSorted();
                const canSort = column.getCanSort();
                const align =
                  column.columnDef.meta?.align === "end" ? "justify-end text-right" : "";
                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : canSort
                            ? "none"
                            : undefined
                    }
                    className={`flex min-w-0 items-center px-3 ${align}`}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={column.getToggleSortingHandler()}
                        className="inline-flex min-h-tap min-w-0 items-center gap-1 font-medium"
                      >
                        <span className="truncate">
                          {flexRender(column.columnDef.header, header.getContext())}
                        </span>
                        {sorted === "asc" ? (
                          <ArrowUp aria-hidden className="h-4 w-4 shrink-0" />
                        ) : sorted === "desc" ? (
                          <ArrowDown aria-hidden className="h-4 w-4 shrink-0" />
                        ) : (
                          <ArrowUpDown aria-hidden className="h-4 w-4 shrink-0 opacity-50" />
                        )}
                      </button>
                    ) : (
                      <span className="truncate">
                        {flexRender(column.columnDef.header, header.getContext())}
                      </span>
                    )}
                  </div>
                );
              })}
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
                  aria-rowindex={rowOffset + item.index + 2}
                  aria-selected={enableRowSelection ? row.getIsSelected() : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`absolute left-0 grid w-full border-b border-line ${
                    row.getIsSelected() ? "bg-surface-subtle" : "bg-surface"
                  } ${onRowClick ? "cursor-pointer" : ""}`}
                  style={{
                    top: item.start,
                    height: rowHeight,
                    gridTemplateColumns: gridTemplate,
                  }}
                  data-testid="table-row"
                >
                  {renderTableRow(row, item.index)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div className="flex flex-col gap-3" aria-busy={loading || undefined}>
      {showToolbar ? (
        <div className="flex flex-col gap-2">
          {props.onSearchChange ? (
            <Input
              label={t("table.toolbar.search")}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            {filterColumns.length > 0 || hideableColumns.length > 0 ? (
              <Button
                variant="secondary"
                leadingIcon={<SlidersHorizontal aria-hidden className="h-4 w-4" />}
                aria-haspopup="dialog"
                onClick={() => setPanelOpen(true)}
              >
                {activeFilters > 0
                  ? t("table.toolbar.filtersActive", { count: formatNumber(activeFilters) })
                  : t("table.toolbar.filters")}
              </Button>
            ) : null}
            {cards && sortableColumns.length > 0 ? (
              <Select
                label={t("table.toolbar.sort")}
                value={sortValue}
                onChange={(e) => {
                  const [id, dir] = e.target.value.split(":");
                  setSorting(id ? [{ id, desc: dir === "desc" }] : []);
                }}
                options={[
                  { value: "", label: t("table.toolbar.sortNone") },
                  ...sortableColumns.flatMap((c) => [
                    {
                      value: `${c.id}:asc`,
                      label: t("table.toolbar.sortAsc", { column: columnLabel(c) }),
                    },
                    {
                      value: `${c.id}:desc`,
                      label: t("table.toolbar.sortDesc", { column: columnLabel(c) }),
                    },
                  ]),
                ]}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" data-testid="table-selection">
          <p className="m-0 font-medium" aria-live="polite">
            {t("table.select.count", { count: formatNumber(selectedIds.length) })}
          </p>
          {renderSelectionActions?.(selectedIds)}
          <Button variant="ghost" size="sm" onClick={() => onRowSelectionChange({})}>
            {t("table.select.clear")}
          </Button>
        </div>
      ) : null}

      {body}

      {usePagination ? (
        <Pagination
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          total={total}
          pageSizeOptions={pageSizeOptions}
          onChange={setPagination}
        />
      ) : null}

      <FilterSheet
        open={panelOpen}
        onOpenChange={setPanelOpen}
        filterColumns={filterColumns}
        hideableColumns={hideableColumns}
        filters={filters}
        onFiltersChange={setFilters}
        onClear={() => setFilters({})}
      />
    </div>
  );
}
