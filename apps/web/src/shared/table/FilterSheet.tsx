import { Button, Input, Select, Sheet } from "@sms/ui";
import type { Column } from "@tanstack/react-table";
import { useEffect, useState } from "react";

import { useT } from "../i18n";

import { columnLabel } from "./columnLabel";

export interface FilterSheetProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterColumns: Column<T, unknown>[];
  hideableColumns: Column<T, unknown>[];
  filters: Record<string, string>;
  onFiltersChange: (next: Record<string, string>) => void;
  onClear: () => void;
}

/**
 * Bottom sheet with the column filters and the column visibility list. Filter values are edited
 * as a draft and applied with "Done", so a server call is not made for every keystroke.
 */
export function FilterSheet<T>({
  open,
  onOpenChange,
  filterColumns,
  hideableColumns,
  filters,
  onFiltersChange,
  onClear,
}: FilterSheetProps<T>) {
  const t = useT();
  const [draft, setDraft] = useState(filters);
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("table.panel.title")}
      closeLabel={t("common.action.close")}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
          >
            {t("table.toolbar.clearFilters")}
          </Button>
          <Button
            onClick={() => {
              onFiltersChange(draft);
              onOpenChange(false);
            }}
          >
            {t("table.panel.done")}
          </Button>
        </>
      }
    >
      {filterColumns.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="table-filters-title">
          <h3 id="table-filters-title" className="m-0 text-lg font-semibold">
            {t("table.panel.filtersTitle")}
          </h3>
          {filterColumns.map((column) => {
            const filter = column.columnDef.meta?.filter;
            const label = columnLabel(column);
            const value = draft[column.id] ?? "";
            if (filter?.type === "select") {
              return (
                <Select
                  key={column.id}
                  label={label}
                  value={value}
                  placeholderOption={t("table.panel.all")}
                  options={filter.options}
                  onChange={(e) => setDraft({ ...draft, [column.id]: e.target.value })}
                />
              );
            }
            return (
              <Input
                key={column.id}
                label={label}
                value={value}
                onChange={(e) => setDraft({ ...draft, [column.id]: e.target.value })}
              />
            );
          })}
        </section>
      ) : null}
      {hideableColumns.length > 0 ? (
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="mb-2 p-0 text-lg font-semibold">
            {t("table.panel.columnsTitle")}
          </legend>
          {hideableColumns.map((column) => (
            <label key={column.id} className="flex min-h-tap items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={column.getIsVisible()}
                onChange={(e) => column.toggleVisibility(e.target.checked)}
              />
              <span>{columnLabel(column)}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
    </Sheet>
  );
}
