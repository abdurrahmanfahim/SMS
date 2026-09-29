import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "./Badge";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog } from "./Dialog";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { Input } from "./Input";
import { Select } from "./Select";
import { Skeleton } from "./Skeleton";

describe("Button", () => {
  it("calls onClick when active", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is aria-disabled and blocks clicks when disabled or loading", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
    rerender(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

describe("Input", () => {
  it("has a visible label linked to the field", () => {
    render(<Input label="Roll" />);
    expect(screen.getByLabelText("Roll")).toBeInTheDocument();
  });

  it("links error and helper text and marks the field invalid", () => {
    render(<Input label="Marks" helperText="0 to 100" error="Too high" errorPrefix="Error" />);
    const field = screen.getByLabelText("Marks");
    expect(field).toHaveAttribute("aria-invalid", "true");
    const described = field.getAttribute("aria-describedby") ?? "";
    expect(described.split(" ")).toHaveLength(2);
    expect(screen.getByText("Too high")).toBeInTheDocument();
    expect(screen.getByText("Error:")).toHaveClass("sr-only");
  });
});

describe("Select", () => {
  it("renders options with a placeholder option", () => {
    render(
      <Select label="Class" placeholderOption="Choose" options={[{ value: "1", label: "One" }]} />,
    );
    expect(screen.getByRole("combobox", { name: "Class" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "One" })).toBeInTheDocument();
  });

  it("explains an empty list instead of showing an empty control", () => {
    render(<Select label="Class" options={[]} emptyText="No class yet" />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("No class yet")).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("always carries text and an icon for status tones", () => {
    const { container } = render(<Badge tone="danger">Absent</Badge>);
    expect(screen.getByText("Absent")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("states", () => {
  it("Skeleton announces its label", () => {
    render(<Skeleton label="Loading" lines={2} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("EmptyState keeps the explanation as real text", () => {
    render(
      <EmptyState title="No exams yet" description="Create one." action={<Button>New</Button>} />,
    );
    expect(screen.getByText("No exams yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });

  it("ErrorState is an alert", () => {
    render(<ErrorState title="Could not save" description="Try again." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  });
});

describe("Dialog", () => {
  it("has a labelled close button and closes on Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Edit" closeLabel="Close">
        body
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("ConfirmDialog", () => {
  it("is an alertdialog, focuses Cancel first and confirms on click", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Publish?"
        description="120 students, 3 sections."
        confirmLabel="Publish"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        destructive
      />,
    );
    expect(screen.getByRole("alertdialog", { name: "Publish?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("blocks both buttons while loading", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="T"
        description="D"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={onConfirm}
        loading
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "No" })).toHaveAttribute("aria-disabled", "true");
  });
});
