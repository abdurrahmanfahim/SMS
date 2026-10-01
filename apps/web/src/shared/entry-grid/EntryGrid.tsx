import { useIsPhone } from "../hooks/useMediaQuery";

import { GridLayout } from "./GridLayout";
import { PhoneLayout } from "./PhoneLayout";
import type { EntryGridProps } from "./types";
import { useEntryGrid } from "./useEntryGrid";

/**
 * Editable grid for fast data entry: marks, fees, attendance corrections.
 * Rows are students, columns are fields. Contract (documented in /dev/kit and in
 * docs/decisions/0006-entry-grid.md): `columns`, `rows`, `onCellCommit(rowId, colId, value)`
 * returning a Promise, and an optional `saveState` per row.
 * It saves nothing itself (no server, no offline queue) and knows no marks rules.
 */
export function EntryGrid(props: EntryGridProps) {
  const phone = useIsPhone();
  const grid = useEntryGrid(props);
  const usePhone = props.layout === "phone" || (props.layout !== "grid" && phone);
  return usePhone ? (
    <PhoneLayout
      label={props.label}
      columns={props.columns}
      rows={props.rows}
      activeColumnId={props.activeColumnId}
      grid={grid}
    />
  ) : (
    <GridLayout
      label={props.label}
      rowHeader={props.rowHeader}
      statusHeader={props.statusHeader}
      columns={props.columns}
      rows={props.rows}
      height={props.height}
      grid={grid}
    />
  );
}
