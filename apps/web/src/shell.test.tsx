import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { createShellRoutes } from "./app/routes";
import { setLocale, t } from "./shared/i18n";
import { RoleProvider } from "./shared/role";

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
