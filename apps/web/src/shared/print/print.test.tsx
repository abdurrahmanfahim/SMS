import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";

import { cssString, pageNumberCss } from "./pageNumberCss";
import { AvoidBreak, NoPrint, PageBreak, PrintButton, PrintLayout, PrintOnly } from "./PrintLayout";

beforeEach(() => setLocale("bn"));
afterEach(cleanup);

describe("pageNumberCss", () => {
  it("builds a margin-box rule with the translated word and both counters", () => {
    const css = pageNumberCss("পাতা");
    expect(css).toContain("@bottom-center");
    expect(css).toContain('"পাতা "');
    expect(css).toContain("counter(page)");
    expect(css).toContain("counter(pages)");
  });

  it("can print Bangla digits", () => {
    expect(pageNumberCss("পাতা", "bengali")).toContain("counter(page, bengali)");
    expect(pageNumberCss("পাতা", "bengali")).toContain("counter(pages, bengali)");
    expect(pageNumberCss("Page")).not.toContain("bengali");
  });

  it("escapes quotes, backslashes and newlines in the label", () => {
    expect(cssString('a"b\\c\nd')).toBe('"a\\"b\\\\c\\A d"');
    expect(pageNumberCss('x"}@page{')).not.toContain('x"}');
  });
});

describe("PrintLayout", () => {
  it("renders header and footer in repeating table sections and content in the body", () => {
    render(
      <PrintLayout header={<h1>প্রতিষ্ঠান</h1>} footer={<p>তথ্যসূত্র</p>}>
        <p>বিষয়বস্তু</p>
      </PrintLayout>,
    );
    const sheet = screen.getByTestId("print-sheet");
    const table = sheet.querySelector("table")!;
    expect(within(table.querySelector("thead")!).getByText("প্রতিষ্ঠান")).toBeInTheDocument();
    expect(within(table.querySelector("tfoot")!).getByText("তথ্যসূত্র")).toBeInTheDocument();
    expect(within(table.querySelector("tbody")!).getByText("বিষয়বস্তু")).toBeInTheDocument();
  });

  it("prints header and footer once when repeat is off", () => {
    render(
      <PrintLayout
        header={<h1>প্রতিষ্ঠান</h1>}
        footer={<p>তথ্যসূত্র</p>}
        repeatHeaderFooter={false}
      >
        <p>বিষয়বস্তু</p>
      </PrintLayout>,
    );
    const table = screen.getByTestId("print-sheet").querySelector("table")!;
    expect(table.querySelector("thead")).toBeNull();
    expect(table.querySelector("tfoot")).toBeNull();
    expect(within(table.querySelector("tbody")!).getByText("প্রতিষ্ঠান")).toBeInTheDocument();
  });

  it("adds signature slots at the end and keeps the layout table out of the accessibility tree", () => {
    render(
      <PrintLayout signatures={[{ label: "শ্রেণি শিক্ষক" }, { label: "প্রধান শিক্ষক" }]}>
        <p>বিষয়বস্তু</p>
      </PrintLayout>,
    );
    expect(within(screen.getByTestId("signatures")).getAllByText(/শিক্ষক/)).toHaveLength(2);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("region", { name: "প্রিন্ট প্রিভিউ (A4)" })).toBeInTheDocument();
  });

  it("includes the page-number style unless turned off", () => {
    const { container, rerender } = render(<PrintLayout>x</PrintLayout>);
    expect(container.querySelector("style")?.textContent).toContain("counter(page, bengali)");
    rerender(<PrintLayout pageNumbers={false}>x</PrintLayout>);
    expect(container.querySelector("style")).toBeNull();
  });

  it("translates the preview label", () => {
    setLocale("en");
    render(<PrintLayout>x</PrintLayout>);
    expect(screen.getByRole("region", { name: "Print preview (A4)" })).toBeInTheDocument();
  });
});

describe("page helpers", () => {
  it("provide break, avoid-break and print/screen switches with the CSS hooks", () => {
    const { container } = render(
      <>
        <PageBreak />
        <AvoidBreak>a</AvoidBreak>
        <PrintOnly>b</PrintOnly>
        <NoPrint>c</NoPrint>
      </>,
    );
    expect(container.querySelector(".sms-page-break")).toBeInTheDocument();
    expect(container.querySelector(".sms-avoid-break")).toHaveTextContent("a");
    expect(container.querySelector(".sms-print-only")).toHaveTextContent("b");
    expect(container.querySelector(".sms-no-print")).toHaveTextContent("c");
  });

  it("PrintButton opens the print dialog", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintButton />);
    fireEvent.click(screen.getByRole("button", { name: "প্রিন্ট করুন" }));
    expect(print).toHaveBeenCalledOnce();
  });
});
