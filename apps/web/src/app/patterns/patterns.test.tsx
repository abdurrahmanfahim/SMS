import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";
import { PageLoading } from "./PageLoading";

afterEach(cleanup);

let shouldThrow = true;
function Boom() {
  if (shouldThrow) throw new Error("boom");
  return <p>fine</p>;
}

describe("ErrorBoundary", () => {
  it("shows the error pattern and recovers on retry", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    shouldThrow = true;
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("কিছু একটা ভুল হয়েছে।");
    expect(screen.queryByText(/boom/)).toBeNull();
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "আবার চেষ্টা করুন" }));
    expect(screen.getByText("fine")).toBeInTheDocument();
  });

  it("clears the error when the reset key changes", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    shouldThrow = true;
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    shouldThrow = false;
    rerender(
      <ErrorBoundary resetKey="/b">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("fine")).toBeInTheDocument();
  });
});

describe("PageLoading", () => {
  it("announces loading", () => {
    render(<PageLoading />);
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("লোড হচ্ছে");
  });
});
