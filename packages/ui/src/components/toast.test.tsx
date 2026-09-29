import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast({ message: "Saved", tone: "success" })}>
      go
    </button>
  );
}

describe("Toast", () => {
  it("shows a message with a labelled close button", async () => {
    render(
      <ToastProvider closeLabel="Close" viewportLabel="Notifications">
        <Trigger />
      </ToastProvider>,
    );
    await act(async () => screen.getByRole("button", { name: "go" }).click());
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
