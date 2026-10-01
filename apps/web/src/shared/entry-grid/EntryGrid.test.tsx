import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";

import { EntryGrid } from "./EntryGrid";
import type { EntryColumn, EntryGridProps, EntryRow, RowSaveState } from "./types";

/** jsdom has no layout: give the scroll containers a box so the virtualiser renders rows. */
function mockLayout() {
  const isScroll = (el: HTMLElement) =>
    el.dataset["testid"] === "entry-grid-scroll" || el.dataset["testid"] === "entry-list-scroll";
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return isScroll(this) ? 640 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return isScroll(this) ? 360 : 0;
  });
}

beforeEach(() => {
  setLocale("en");
  mockLayout();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const columns: EntryColumn[] = [
  { id: "math", label: "Maths", type: "number", min: 0, max: 100 },
  { id: "eng", label: "English", type: "number", min: 0, max: 100 },
  {
    id: "att",
    label: "Attendance",
    type: "code",
    codes: [{ value: "AB", label: "Absent" }],
  },
];

const makeRows = (n: number): EntryRow[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, label: `Student ${i + 1}`, values: {} }));

function setup(over: Partial<EntryGridProps> = {}) {
  const onCellCommit = vi.fn<EntryGridProps["onCellCommit"]>(() => Promise.resolve());
  const utils = render(
    <EntryGrid
      label="Marks"
      rowHeader="Student"
      statusHeader="Status"
      columns={columns}
      rows={makeRows(5)}
      onCellCommit={onCellCommit}
      layout="grid"
      {...over}
    />,
  );
  const cell = (row: number, col: number) =>
    screen.getByRole("textbox", {
      name: `Student ${row}, ${columns[col - 1]?.label ?? ""}`,
    }) as HTMLInputElement;
  return { ...utils, onCellCommit, cell };
}

describe("EntryGrid (grid layout): semantics", () => {
  it("is an ARIA grid with row and column counts, headers and labelled cells", () => {
    setup();
    const grid = screen.getByRole("grid", { name: "Marks" });
    expect(grid).toHaveAttribute("aria-rowcount", "6");
    expect(grid).toHaveAttribute("aria-colcount", "5");
    expect(
      within(grid)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Student", "Maths", "English", "Attendance", "Status"]);
    expect(within(grid).getAllByRole("rowheader")[0]).toHaveTextContent("Student 1");
    expect(screen.getByRole("textbox", { name: "Student 2, English" })).toBeInTheDocument();
  });

  it("has exactly one tab stop inside the grid (roving tabindex)", () => {
    setup();
    const stops = screen.getAllByRole("textbox").filter((el) => el.tabIndex === 0);
    expect(stops).toHaveLength(1);
  });

  it("uses the decimal keypad for numbers", () => {
    const { cell } = setup();
    expect(cell(1, 1)).toHaveAttribute("inputmode", "decimal");
    expect(cell(1, 3)).toHaveAttribute("inputmode", "text");
  });
});

describe("EntryGrid (grid layout): keyboard", () => {
  it("Enter saves the value and moves down", async () => {
    const { cell, onCellCommit } = setup();
    cell(1, 1).focus();
    fireEvent.change(cell(1, 1), { target: { value: "90" } });
    fireEvent.keyDown(cell(1, 1), { key: "Enter" });
    await waitFor(() => expect(cell(2, 1)).toHaveFocus());
    expect(onCellCommit).toHaveBeenCalledWith("s1", "math", "90");
    expect(onCellCommit).toHaveBeenCalledTimes(1);
  });

  it("arrow up and down move between rows, left and right only at the text edge", () => {
    const { cell } = setup();
    cell(2, 2).focus();
    fireEvent.change(cell(2, 2), { target: { value: "55" } });
    cell(2, 2).setSelectionRange(1, 1);
    fireEvent.keyDown(cell(2, 2), { key: "ArrowRight" });
    expect(cell(2, 2)).toHaveFocus(); // caret in the middle: stays in the field
    cell(2, 2).setSelectionRange(2, 2);
    fireEvent.keyDown(cell(2, 2), { key: "ArrowRight" });
    expect(cell(2, 3)).toHaveFocus();
    fireEvent.keyDown(cell(2, 3), { key: "ArrowUp" });
    expect(cell(1, 3)).toHaveFocus();
    fireEvent.keyDown(cell(1, 3), { key: "ArrowDown" });
    expect(cell(2, 3)).toHaveFocus();
  });

  it("Tab and Shift+Tab move cell to cell and wrap to the next row", () => {
    const { cell } = setup();
    cell(1, 3).focus();
    fireEvent.keyDown(cell(1, 3), { key: "Tab" });
    expect(cell(2, 1)).toHaveFocus();
    fireEvent.keyDown(cell(2, 1), { key: "Tab", shiftKey: true });
    expect(cell(1, 3)).toHaveFocus();
  });

  it("Tab leaves the grid after the last cell instead of trapping focus", () => {
    const { cell } = setup();
    cell(5, 3).focus();
    const notPrevented = fireEvent.keyDown(cell(5, 3), { key: "Tab" });
    expect(notPrevented).toBe(true);
  });

  it("Escape throws away what was typed and saves nothing", () => {
    const { cell, onCellCommit } = setup();
    cell(1, 1).focus();
    fireEvent.change(cell(1, 1), { target: { value: "77" } });
    fireEvent.keyDown(cell(1, 1), { key: "Escape" });
    expect(cell(1, 1).value).toBe("");
    fireEvent.blur(cell(1, 1));
    expect(onCellCommit).not.toHaveBeenCalled();
  });
});

describe("EntryGrid: digits and validation", () => {
  it("turns Bangla digits into ASCII while typing and saves ASCII", async () => {
    const { cell, onCellCommit } = setup();
    cell(1, 1).focus();
    fireEvent.change(cell(1, 1), { target: { value: "৮৫" } });
    expect(cell(1, 1).value).toBe("85");
    fireEvent.keyDown(cell(1, 1), { key: "Enter" });
    await waitFor(() => expect(onCellCommit).toHaveBeenCalledWith("s1", "math", "85"));
  });

  it("keeps an invalid value, shows a translated message and does not save", () => {
    const { cell, onCellCommit } = setup();
    cell(1, 1).focus();
    fireEvent.change(cell(1, 1), { target: { value: "150" } });
    fireEvent.keyDown(cell(1, 1), { key: "Enter" });
    expect(cell(1, 1).value).toBe("150");
    expect(cell(1, 1)).toHaveAttribute("aria-invalid", "true");
    expect(cell(1, 1)).toHaveAccessibleDescription("Must not be more than 100.");
    expect(onCellCommit).not.toHaveBeenCalled();
  });

  it("the message follows the language and shows Bangla numbers", () => {
    setLocale("bn");
    const { cell } = setup();
    fireEvent.change(cell(1, 1), { target: { value: "150" } });
    fireEvent.blur(cell(1, 1));
    expect(cell(1, 1)).toHaveAccessibleDescription(/১০০/);
  });

  it("matches a code in any case and saves the canonical code", async () => {
    const { cell, onCellCommit } = setup();
    fireEvent.change(cell(1, 3), { target: { value: "ab" } });
    fireEvent.blur(cell(1, 3));
    await waitFor(() => expect(onCellCommit).toHaveBeenCalledWith("s1", "att", "AB"));
  });

  it("clearing a saved value saves an empty string", async () => {
    const { cell, onCellCommit } = setup({
      rows: [{ id: "s1", label: "Student 1", values: { math: "40" } }],
    });
    expect(cell(1, 1).value).toBe("40");
    fireEvent.change(cell(1, 1), { target: { value: "" } });
    fireEvent.blur(cell(1, 1));
    await waitFor(() => expect(onCellCommit).toHaveBeenCalledWith("s1", "math", ""));
  });

  it("does not save an unchanged value", () => {
    const { cell, onCellCommit } = setup({
      rows: [{ id: "s1", label: "Student 1", values: { math: "40" } }],
    });
    fireEvent.change(cell(1, 1), { target: { value: "৪০" } });
    fireEvent.blur(cell(1, 1));
    expect(onCellCommit).not.toHaveBeenCalled();
  });
});

describe("EntryGrid: save state", () => {
  it("shows Saving, then Saved, from the returned promise", async () => {
    let resolve!: () => void;
    const onCellCommit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { cell } = setup({ onCellCommit });
    fireEvent.change(cell(1, 1), { target: { value: "9" } });
    fireEvent.blur(cell(1, 1));
    expect(await screen.findByText("Saving")).toBeInTheDocument();
    resolve();
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("shows Error on rejection and keeps the typed value so it can be retried", async () => {
    const onCellCommit = vi
      .fn<EntryGridProps["onCellCommit"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const { cell } = setup({ onCellCommit });
    fireEvent.change(cell(1, 1), { target: { value: "9" } });
    fireEvent.blur(cell(1, 1));
    expect(await screen.findByText("Error")).toBeInTheDocument();
    expect(cell(1, 1).value).toBe("9");
    fireEvent.focus(cell(1, 1));
    fireEvent.keyDown(cell(1, 1), { key: "Enter" });
    await waitFor(() => expect(onCellCommit).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("a saveState prop wins over the derived state (Pending n from the offline queue)", () => {
    const saveState: Record<string, RowSaveState> = { s2: { status: "pending", count: 3 } };
    setup({ saveState });
    expect(screen.getByText("Pending 3")).toBeInTheDocument();
  });
});

describe("EntryGrid: virtualisation", () => {
  it("keeps only a window of 100 rows in the DOM", () => {
    setup({ rows: makeRows(100) });
    const grid = screen.getByRole("grid", { name: "Marks" });
    expect(grid).toHaveAttribute("aria-rowcount", "101");
    expect(screen.getAllByTestId("entry-grid-row").length).toBeLessThan(40);
  });
});

describe("EntryGrid (phone layout)", () => {
  const phone = (over: Partial<EntryGridProps> = {}) => {
    const onCellCommit = vi.fn<EntryGridProps["onCellCommit"]>(() => Promise.resolve());
    render(
      <EntryGrid
        label="Marks"
        rowHeader="Student"
        statusHeader="Status"
        columns={columns}
        rows={makeRows(5)}
        onCellCommit={onCellCommit}
        layout="phone"
        activeColumnId="math"
        {...over}
      />,
    );
    return { onCellCommit };
  };
  const field = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;

  it("list mode: one numeric field per student, progress line, Next moves down", async () => {
    const { onCellCommit } = phone();
    expect(screen.getByTestId("entry-progress")).toHaveTextContent("0 of 5 entered");
    expect(screen.getAllByTestId("entry-list-row")).toHaveLength(5);
    expect(field("Student 1, Maths")).toHaveAttribute("inputmode", "decimal");
    field("Student 1, Maths").focus();
    fireEvent.change(field("Student 1, Maths"), { target: { value: "৯০" } });
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    await waitFor(() => expect(field("Student 2, Maths")).toHaveFocus());
    expect(onCellCommit).toHaveBeenCalledWith("s1", "math", "90");
    expect(screen.getByTestId("entry-progress")).toHaveTextContent("1 of 5 entered");
  });

  it("list mode: Enter on the keypad also saves and moves down", async () => {
    const { onCellCommit } = phone();
    field("Student 3, Maths").focus();
    fireEvent.change(field("Student 3, Maths"), { target: { value: "70" } });
    fireEvent.keyDown(field("Student 3, Maths"), { key: "Enter" });
    await waitFor(() => expect(field("Student 4, Maths")).toHaveFocus());
    expect(onCellCommit).toHaveBeenCalledWith("s3", "math", "70");
  });

  it("list mode: the Next button does not take focus from the field (keyboard stays open)", () => {
    phone();
    const next = screen.getByRole("button", { name: /Next/ });
    const notPrevented = fireEvent.mouseDown(next);
    expect(notPrevented).toBe(false);
  });

  it("list mode: an invalid value stays and is announced", () => {
    phone();
    fireEvent.change(field("Student 1, Maths"), { target: { value: "999" } });
    fireEvent.blur(field("Student 1, Maths"));
    expect(field("Student 1, Maths").value).toBe("999");
    expect(field("Student 1, Maths")).toHaveAttribute("aria-invalid", "true");
  });

  it("cell editor (several columns): Next and Previous walk the cells row by row", async () => {
    const { onCellCommit } = phone({ activeColumnId: undefined });
    expect(screen.getByTestId("entry-progress")).toHaveTextContent("Cell 1 of 15");
    expect(screen.getByRole("heading", { name: "Student 1" })).toBeInTheDocument();
    fireEvent.change(field("Student 1, Maths"), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    await waitFor(() => expect(field("Student 1, English")).toBeInTheDocument());
    expect(onCellCommit).toHaveBeenCalledWith("s1", "math", "55");
    fireEvent.click(screen.getByRole("button", { name: /Previous/ }));
    await waitFor(() => expect(field("Student 1, Maths").value).toBe("55"));
    expect(screen.getByRole("button", { name: /Previous/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
