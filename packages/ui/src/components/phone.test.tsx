import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ReorderList } from "./ReorderList";
import { StickyActionBar } from "./StickyActionBar";

function Demo() {
  const [items, setItems] = useState(["A", "B", "C"]);
  return (
    <ReorderList
      items={items}
      getKey={(i) => i}
      renderItem={(i) => <span>{i}</span>}
      onChange={setItems}
      moveUpLabel={(i) => `up ${i}`}
      moveDownLabel={(i) => `down ${i}`}
    />
  );
}

const order = () => screen.getAllByRole("listitem").map((li) => li.textContent);

describe("ReorderList", () => {
  it("reorders with buttons only (no drag needed)", async () => {
    render(<Demo />);
    await userEvent.click(screen.getByRole("button", { name: "down A" }));
    expect(order()).toEqual(["B", "A", "C"]);
    await userEvent.click(screen.getByRole("button", { name: "up C" }));
    expect(order()).toEqual(["B", "C", "A"]);
  });

  it("disables moves past the ends", () => {
    render(<Demo />);
    expect(screen.getByRole("button", { name: "up A" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "down C" })).toBeDisabled();
  });
});

describe("StickyActionBar", () => {
  it("renders a labelled group with its actions and a spacer", () => {
    const { container } = render(
      <StickyActionBar ariaLabel="Actions">
        <button type="button">Save</button>
      </StickyActionBar>,
    );
    expect(screen.getByRole("group", { name: "Actions" })).toHaveClass("sms-action-bar");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(container.querySelector(".sms-action-bar-spacer")).toBeInTheDocument();
  });
});
