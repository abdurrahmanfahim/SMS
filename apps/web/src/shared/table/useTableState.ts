import type {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { useDebouncedValue } from "../hooks/useDebouncedValue";

import type { ServerTableParams } from "./types";

export interface UseTableStateOptions {
  pageSize?: number;
  initialSorting?: SortingState;
  /** Delay before typed search text reaches `params.search`. Default 300 ms. */
  searchDebounceMs?: number;
}

/**
 * Holds all list state for a `DataTable` and turns it into request parameters for a server call.
 * Changing the sort, search or a filter returns to page 1.
 *
 * ```tsx
 * const { tableProps, params } = useTableState({ pageSize: 25 });
 * const { data, isLoading } = useStudents(params);   // the feature's own fetch hook
 * return <DataTable {...tableProps} data={data.rows} rowCount={data.total} ... />;
 * ```
 */
export function useTableState(options: UseTableStateOptions = {}) {
  const { pageSize = 25, initialSorting = [], searchDebounceMs = 300 } = options;
  const [pagination, setPaginationState] = useState<PaginationState>({ pageIndex: 0, pageSize });
  const [sorting, setSortingState] = useState<SortingState>(initialSorting);
  const [search, setSearchState] = useState("");
  const [filters, setFiltersState] = useState<Record<string, string>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const firstPage = useCallback(
    () => setPaginationState((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 })),
    [],
  );

  const debouncedSearch = useDebouncedValue(search, searchDebounceMs);

  const params = useMemo<ServerTableParams>(() => {
    const active: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== "") active[key] = value;
    }
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sort: sorting.map((s) => ({ id: s.id, desc: s.desc })),
      search: debouncedSearch.trim(),
      filters: active,
    };
  }, [pagination, sorting, debouncedSearch, filters]);

  const tableProps = {
    pagination,
    onPaginationChange: (next: PaginationState) => setPaginationState(next),
    sorting,
    onSortingChange: (next: SortingState) => {
      setSortingState(next);
      firstPage();
    },
    search,
    onSearchChange: (next: string) => {
      setSearchState(next);
      firstPage();
    },
    filters,
    onFiltersChange: (next: Record<string, string>) => {
      setFiltersState(next);
      firstPage();
    },
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    rowSelection,
    onRowSelectionChange: setRowSelection,
  };

  return {
    tableProps,
    params,
    selectedIds: Object.keys(rowSelection).filter((id) => rowSelection[id]),
  };
}

/** Column filters state in TanStack's shape, from the flat `{ columnId: value }` record. */
export function toColumnFilters(filters: Record<string, string>): ColumnFiltersState {
  return Object.entries(filters)
    .filter(([, value]) => value !== "")
    .map(([id, value]) => ({ id, value }));
}
