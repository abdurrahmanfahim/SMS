import { CircleAlert } from "lucide-react";
import { memo, type KeyboardEvent, type Ref } from "react";

import { asciiWhileTyping } from "../forms/digits";

import type { EntryColumn } from "./types";

export interface CellInputProps {
  id: string;
  rowId: string;
  column: EntryColumn;
  value: string;
  /** Translated problem text, when the cell is invalid. */
  error: string | undefined;
  /** Accessible name: row and column, for example "Rubel Hossain, Mathematics". */
  label: string;
  tabIndex?: number;
  enterKeyHint?: "next" | "done" | "enter";
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  onType: (rowId: string, colId: string, raw: string) => void;
  onCommit: (rowId: string, colId: string) => void;
  onFocusCell?: (rowId: string, colId: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>, rowId: string, colId: string) => void;
}

/** The one text field used by both layouts. Numbers get the decimal keypad. */
export const CellInput = memo(function CellInput(props: CellInputProps) {
  const { column, rowId, error } = props;
  const errorId = `${props.id}-err`;
  return (
    <div className="relative w-full min-w-0">
      <input
        id={props.id}
        ref={props.inputRef}
        type="text"
        inputMode={column.type === "number" ? (column.integer ? "numeric" : "decimal") : "text"}
        enterKeyHint={props.enterKeyHint}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={props.label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        tabIndex={props.tabIndex}
        value={props.value}
        data-col={column.id}
        data-row={rowId}
        className={`min-h-tap w-full min-w-0 rounded-md border bg-surface px-2 text-base text-content ${
          error ? "border-2 border-danger pe-7" : "border-line-strong"
        } ${props.className ?? ""}`}
        onChange={(e) =>
          props.onType(
            rowId,
            column.id,
            column.type === "number" ? asciiWhileTyping(e.target.value) : e.target.value,
          )
        }
        onBlur={() => props.onCommit(rowId, column.id)}
        onFocus={() => props.onFocusCell?.(rowId, column.id)}
        onKeyDown={(e) => props.onKeyDown?.(e, rowId, column.id)}
      />
      {error ? (
        <>
          <CircleAlert
            aria-hidden
            className="pointer-events-none absolute end-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-danger"
          />
          <span id={errorId} className="sr-only">
            {error}
          </span>
        </>
      ) : null}
    </div>
  );
});
