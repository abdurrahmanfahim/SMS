import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { createShellRoutes, partitionFeatureRoutes } from "./routes";

afterEach(cleanup);

function renderAt(path: string, featureRoutes: RouteObject[] = []) {
  const router = createMemoryRouter(createShellRoutes(featureRoutes), { initialEntries: [path] });
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

describe("feature routes", () => {
  const feature: RouteObject[] = [
    { path: "/app/students", element: <p data-testid="students">students</p> },
    { path: "/parent/results", element: <p data-testid="results">results</p> },
  ];

  it("mounts feature routes inside their group", () => {
    renderAt("/app/students", feature);
    expect(screen.getByTestId("students")).toBeInTheDocument();
    cleanup();
    renderAt("/parent/results", feature);
    expect(screen.getByTestId("results")).toBeInTheDocument();
  });

  it("makes paths relative to the group", () => {
    const out = partitionFeatureRoutes(feature);
    expect(out.app.map((r) => r.path)).toEqual(["students"]);
    expect(out.parent.map((r) => r.path)).toEqual(["results"]);
  });

  it("rejects paths outside the four groups", () => {
    expect(() => partitionFeatureRoutes([{ path: "/elsewhere" }])).toThrow(/must start with/);
    expect(() => partitionFeatureRoutes([{}])).toThrow(/must start with/);
  });
});
