import { Navigate, Outlet, type RouteObject } from "react-router-dom";

import { GroupGuard } from "./guards";
import { Placeholder } from "./pages/Placeholder";

/** Wraps a group's pages: guard first (stub until M1-P2), then the group layout. */
function group(
  path: string,
  guard: "auth" | "app" | "platform" | "parent",
  pages: RouteObject[],
): RouteObject {
  return {
    path,
    element: <GroupGuard group={guard} />,
    children: [{ element: <Outlet />, children: pages }],
  };
}

/**
 * The shell's route table. Groups: /auth/*, /app/* (staff), /platform/* (platform console),
 * /parent/* (guardian). Feature routes are merged in by step 2.
 */
export function createShellRoutes(): RouteObject[] {
  return [
    { path: "/", element: <Navigate to="/app" replace /> },
    group("/auth", "auth", [
      { index: true, element: <Navigate to="login" replace /> },
      { path: "login", element: <Placeholder name="SMS" /> },
    ]),
    group("/app", "app", [{ index: true, element: <Placeholder name="SMS" /> }]),
    group("/platform", "platform", [{ index: true, element: <Placeholder name="SMS" /> }]),
    group("/parent", "parent", [{ index: true, element: <Placeholder name="SMS" /> }]),
    { path: "*", element: <Navigate to="/" replace /> },
  ];
}
