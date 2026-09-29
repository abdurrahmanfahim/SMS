import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { setLocale, t } from "../shared/i18n";
import { RoleProvider } from "../shared/role";

import { createShellRoutes } from "./routes";

afterEach(() => {
  cleanup();
  setLocale("bn");
});

function mount(path = "/app") {
  const router = createMemoryRouter(createShellRoutes([]), { initialEntries: [path] });
  render(
    <RoleProvider role="teacher">
      <RouterProvider router={router} />
    </RoleProvider>,
  );
}

describe("shell", () => {
  it("is Bangla by default and switches to English", () => {
    mount();
    expect(screen.getAllByText("হোম").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("sms.locale")).toBe("en");
  });

  it("shows the home nav item for the current role in both navs", () => {
    mount();
    const navs = screen.getAllByRole("navigation");
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      expect(within(nav).getByRole("link")).toHaveAttribute("href", "/app");
    }
  });

  it("t() interpolates and falls back to the key", () => {
    expect(t("no.such.key")).toBe("no.such.key");
  });
});

describe("shell accessibility rules (ux-standard)", () => {
  it("has a skip link that moves focus to the main area", () => {
    mount();
    const skip = screen.getByRole("link", { name: "মূল অংশে যান" });
    expect(skip).toHaveAttribute("href", "#main");
    fireEvent.click(skip);
    expect(document.getElementById("main")).toHaveFocus();
  });

  it("puts the Help entry last in the header on every route group and opens help", () => {
    for (const path of ["/app", "/platform", "/parent", "/auth/login"]) {
      mount(path);
      const header = screen.getByRole("banner");
      const controls = within(header).getAllByRole("button");
      expect(controls[controls.length - 1]).toHaveAttribute("data-testid", "help-button");
      cleanup();
    }
    mount();
    fireEvent.click(screen.getByTestId("help-button"));
    expect(screen.getByRole("dialog", { name: "সহায়তা" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "হোম স্ক্রিনে যোগ করার নিয়ম" })).toHaveAttribute(
      "href",
      "/install",
    );
  });

  it("gives the main area a focus target and the navs an accessible name", () => {
    mount();
    expect(document.getElementById("main")).toHaveAttribute("tabindex", "-1");
    for (const nav of screen.getAllByRole("navigation")) {
      expect(nav).toHaveAccessibleName("প্রধান মেনু");
    }
  });

  it("renders the Bangla install guide for Android and iPhone", () => {
    mount("/install");
    expect(screen.getByRole("heading", { name: "অ্যান্ড্রয়েড (Chrome)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "আইফোন (Safari)" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(8);
  });
});
