import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfflineNotice } from "./OfflineNotice";
import { UpdatePromptView } from "./UpdatePrompt";

afterEach(cleanup);

describe("UpdatePromptView", () => {
  it("renders nothing when no update is waiting", () => {
    const { container } = render(
      <UpdatePromptView visible={false} onUpdate={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("offers update and later", () => {
    const onUpdate = vi.fn();
    const onDismiss = vi.fn();
    render(<UpdatePromptView visible onUpdate={onUpdate} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "আপডেট করুন" }));
    fireEvent.click(screen.getByRole("button", { name: "পরে" }));
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("OfflineNotice", () => {
  it("appears when the browser goes offline and disappears when it returns", () => {
    render(<OfflineNotice />);
    expect(screen.queryByTestId("offline-notice")).toBeNull();
    act(() => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByTestId("offline-notice")).toBeInTheDocument();
    act(() => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByTestId("offline-notice")).toBeNull();
  });
});
