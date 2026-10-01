import { createColumnHelper, type SortingState } from "@tanstack/react-table";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";

import { DataTable, type DataTableProps } from "./DataTable";
import { useTableState } from "./useTableState";

interface Student {
  id: string;
  name: string;
  roll: number;
  section: string;
}

const helper = createColumnHelper<Student>();
const columns = [
  helper.accessor("name", { header: "নাম", meta: { filter: { type: "text" }, card: "title" } }),
  helper.accessor("roll", { header: "রোল", meta: { align: "end" } }),
  helper.accessor("section", {
    header: "শাখা",
    meta: {
      card: "subtitle",
      filter: {
        type: "select",
        options: [
          { value: "ক", label: "ক" },
          { value: "খ", label: "খ" },
        ],
      },
    },
  }),
];

const people = (n: number): Student[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    name: `শিক্ষার্থী ${i + 1}`,
    roll: i + 1,
    section: i % 2 === 0 ? "ক" : "খ",
  }));

/** jsdom has no layout: give the scroll container a 360 x 640 box so the virtualiser renders rows. */
function mockLayout() {
  const isScroll = (el: HTMLElement) => el.dataset["testid"] === "table-scroll";
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

function mockPhone(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width: 767px") ? matches : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  setLocale("bn");
  mockLayout();
  mockPhone(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const base = (over: Partial<DataTableProps<Student>> = {}): DataTableProps<Student> => ({
  label: "শিক্ষার্থীর তালিকা",
  columns,
  data: people(5),
  getRowId: (s) => s.id,
  ...over,
});

const bodyRows = () => screen.queryAllByTestId("table-row");

describe("DataTable table mode", () => {
  it("renders headers, rows and table semantics", () => {
    render(<DataTable {...base()} />);
    const table = screen.getByRole("table", { name: "শিক্ষার্থীর তালিকা" });
    expect(table).toHaveAttribute("aria-rowcount", "6");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    expect(bodyRows()).toHaveLength(5);
  });

  it("virtualises: 10,000 rows put only a few rows in the DOM", () => {
    render(<DataTable {...base({ data: people(10_000) })} />);
    expect(bodyRows().length).toBeGreaterThan(0);
    expect(bodyRows().length).toBeLessThan(40);
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "10001");
  });

  it("makes the scrolling area reachable by keyboard and gives it the table's name", () => {
    render(<DataTable {...base()} />);
    const region = screen.getByRole("region", { name: "শিক্ষার্থীর তালিকা" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toContainElement(screen.getByRole("table", { name: "শিক্ষার্থীর তালিকা" }));
  });

  it("sorts client-side and marks the header with aria-sort", () => {
    render(<DataTable {...base()} />);
    const rollHeader = screen.getByRole("columnheader", { name: /রোল/ });
    expect(rollHeader).toHaveAttribute("aria-sort", "none");
    // numeric columns sort descending on the first click
    fireEvent.click(within(rollHeader).getByRole("button"));
    expect(rollHeader).toHaveAttribute("aria-sort", "descending");
    expect(within(bodyRows()[0]!).getByText("৫")).toBeInTheDocument();
  });

  it("shows numbers in the UI language's digits: Bangla digits in Bangla, ASCII in English", () => {
    const { unmount } = render(<DataTable {...base()} />);
    expect(within(bodyRows()[2]!).getByText("৩")).toBeInTheDocument();
    unmount();
    setLocale("en");
    render(<DataTable {...base()} />);
    expect(within(bodyRows()[2]!).getByText("3")).toBeInTheDocument();
  });

  it("sorts text in Bangla collation order", () => {
    const data = [
      { id: "a", name: "সুমি", roll: 1, section: "ক" },
      { id: "b", name: "অনিক", roll: 2, section: "ক" },
      { id: "c", name: "মিতা", roll: 3, section: "ক" },
    ];
    render(<DataTable {...base({ data })} />);
    fireEvent.click(within(screen.getByRole("columnheader", { name: /নাম/ })).getByRole("button"));
    expect(bodyRows().map((r) => within(r).getAllByRole("cell")[0]!.textContent)).toEqual([
      "অনিক",
      "মিতা",
      "সুমি",
    ]);
  });

  it("reports sorting changes when controlled", () => {
    const onSortingChange = vi.fn();
    render(<DataTable {...base({ sorting: [], onSortingChange, rowCount: 5 })} />);
    fireEvent.click(within(screen.getByRole("columnheader", { name: /নাম/ })).getByRole("button"));
    expect(onSortingChange).toHaveBeenCalledWith([{ id: "name", desc: false }]);
  });

  it("searches client-side", () => {
    function Harness() {
      const [search, setSearch] = useState("");
      return <DataTable {...base({ search, onSearchChange: setSearch, data: people(20) })} />;
    }
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("অনুসন্ধান"), { target: { value: "শিক্ষার্থী 12" } });
    expect(bodyRows()).toHaveLength(1);
  });

  it("filters by a select column from the filter sheet", () => {
    render(<DataTable {...base({ data: people(10) })} />);
    fireEvent.click(screen.getByRole("button", { name: "ফিল্টার" }));
    fireEvent.change(screen.getByRole("combobox", { name: "শাখা" }), { target: { value: "খ" } });
    fireEvent.click(screen.getByRole("button", { name: "সম্পন্ন" }));
    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByRole("button", { name: /ফিল্টার \(১\)/ })).toBeInTheDocument();
  });

  it("hides a column from the filter sheet", () => {
    render(<DataTable {...base()} />);
    fireEvent.click(screen.getByRole("button", { name: "ফিল্টার" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "রোল" }));
    expect(screen.queryByRole("columnheader", { name: /রোল/ })).toBeNull();
  });

  it("selects rows, selects the page and clears", () => {
    render(<DataTable {...base({ enableRowSelection: true })} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "শিক্ষার্থী 2 বাছাই করুন" }));
    expect(screen.getByTestId("table-selection")).toHaveTextContent("১টি বাছাই করা হয়েছে");
    fireEvent.click(screen.getByRole("checkbox", { name: "এই পাতার সবগুলো বাছাই করুন" }));
    expect(screen.getByTestId("table-selection")).toHaveTextContent("৫টি বাছাই করা হয়েছে");
    fireEvent.click(screen.getByRole("button", { name: "বাছাই মুছুন" }));
    expect(screen.queryByTestId("table-selection")).toBeNull();
  });

  it("first cell is a button when rows are clickable", () => {
    const onRowClick = vi.fn();
    render(<DataTable {...base({ onRowClick })} />);
    fireEvent.click(within(bodyRows()[1]!).getByRole("button"));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: "s2" }));
  });
});

describe("DataTable server mode", () => {
  it("pages with previous and next and shows the total", () => {
    const onPaginationChange = vi.fn();
    render(
      <DataTable
        {...base({
          data: people(25),
          rowCount: 240,
          pagination: { pageIndex: 1, pageSize: 25 },
          onPaginationChange,
        })}
      />,
    );
    const bar = screen.getByTestId("table-pagination");
    expect(bar).toHaveTextContent("২৬–৫০ / ২৪০");
    expect(bar).toHaveTextContent("পাতা ২ / ১০");
    fireEvent.click(screen.getByRole("button", { name: "পরের পাতা" }));
    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 2, pageSize: 25 });
    fireEvent.click(screen.getByRole("button", { name: "আগের পাতা" }));
    expect(onPaginationChange).toHaveBeenLastCalledWith({ pageIndex: 0, pageSize: 25 });
  });

  it("does not sort or filter rows itself (the server does)", () => {
    render(
      <DataTable
        {...base({ rowCount: 100, sorting: [{ id: "roll", desc: true }], data: people(3) })}
      />,
    );
    expect(within(bodyRows()[0]!).getByText("১")).toBeInTheDocument();
  });

  it("disables previous on the first page and next on the last", () => {
    render(
      <DataTable
        {...base({
          rowCount: 5,
          pagination: { pageIndex: 0, pageSize: 25 },
          onPaginationChange: vi.fn(),
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "আগের পাতা" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "পরের পাতা" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("DataTable states", () => {
  it("shows loading, error with retry, and empty", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<DataTable {...base({ loading: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("তালিকা লোড হচ্ছে");
    rerender(<DataTable {...base({ error: true, onRetry })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("তালিকা লোড করা যায়নি।");
    fireEvent.click(screen.getByRole("button", { name: "আবার চেষ্টা করুন" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<DataTable {...base({ data: [] })} />);
    expect(screen.getByText("কোনো তথ্য পাওয়া যায়নি।")).toBeInTheDocument();
  });
});

describe("DataTable card mode", () => {
  it("uses cards on a phone in auto mode and table on a wide screen", () => {
    mockPhone(true);
    const { unmount } = render(<DataTable {...base()} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByTestId("table-card")).toHaveLength(5);
    unmount();
    mockPhone(false);
    render(<DataTable {...base()} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("keeps the card list scrollable by keyboard even when cards are not clickable", () => {
    mockPhone(true);
    render(<DataTable {...base()} />);
    const region = screen.getByRole("region", { name: "শিক্ষার্থীর তালিকা" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(within(region).queryAllByRole("button")).toHaveLength(0);
  });

  it("shows title, subtitle and meta lines from column roles, and is one tap target", () => {
    mockPhone(true);
    const onRowClick = vi.fn();
    render(<DataTable {...base({ onRowClick })} />);
    const card = screen.getAllByTestId("table-card")[0]!;
    expect(within(card).getByText("শিক্ষার্থী 1")).toBeInTheDocument();
    expect(within(card).getAllByRole("button")).toHaveLength(1);
    fireEvent.click(within(card).getByRole("button"));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
  });

  it("sorts through a select because cards have no header row", () => {
    mockPhone(true);
    const onSortingChange = vi.fn();
    render(<DataTable {...base({ sorting: [] as SortingState, onSortingChange, rowCount: 5 })} />);
    fireEvent.change(screen.getByLabelText("সাজান"), { target: { value: "roll:desc" } });
    expect(onSortingChange).toHaveBeenCalledWith([{ id: "roll", desc: true }]);
  });

  it("keeps selection checkboxes outside the card button", () => {
    mockPhone(true);
    render(<DataTable {...base({ enableRowSelection: true, onRowClick: vi.fn() })} />);
    const card = screen.getAllByTestId("table-card")[0]!;
    expect(within(card).getAllByRole("button")).toHaveLength(1);
    expect(within(card).getByRole("checkbox")).toBeInTheDocument();
  });

  it("virtualises cards too", () => {
    mockPhone(true);
    render(<DataTable {...base({ data: people(10_000) })} />);
    expect(screen.getAllByTestId("table-card").length).toBeLessThan(30);
  });
});

describe("useTableState", () => {
  it("returns 1-based server params and goes back to page 1 when sort, search or filters change", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTableState({ pageSize: 10, searchDebounceMs: 100 }));
    act(() => result.current.tableProps.onPaginationChange({ pageIndex: 3, pageSize: 10 }));
    expect(result.current.params.page).toBe(4);
    act(() => result.current.tableProps.onSortingChange([{ id: "roll", desc: true }]));
    expect(result.current.params.page).toBe(1);
    expect(result.current.params.sort).toEqual([{ id: "roll", desc: true }]);
    act(() => result.current.tableProps.onPaginationChange({ pageIndex: 2, pageSize: 10 }));
    act(() => result.current.tableProps.onFiltersChange({ section: "ক", name: "" }));
    expect(result.current.params.page).toBe(1);
    expect(result.current.params.filters).toEqual({ section: "ক" });
    act(() => result.current.tableProps.onSearchChange("  রুবেল "));
    expect(result.current.params.search).toBe("");
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.params.search).toBe("রুবেল");
    vi.useRealTimers();
  });
});
