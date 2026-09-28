import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { createShellRoutes } from "./routes";

afterEach(cleanup);

function renderAt(path: string) {
  const router = createMemoryRouter(createShellRoutes(), { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("shell route groups", () => {
  it.each(["/app", "/platform", "/parent", "/auth/login"])("renders %s", (path) => {
    const router = renderAt(path);
    expect(screen.getByTestId("page-SMS")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
  });

  it("redirects / to /app and /auth to /auth/login", () => {
    expect(renderAt("/").state.location.pathname).toBe("/app");
    expect(renderAt("/auth").state.location.pathname).toBe("/auth/login");
  });

  it("sends unknown paths home", () => {
    expect(renderAt("/nope/nothing").state.location.pathname).toBe("/app");
  });
});
