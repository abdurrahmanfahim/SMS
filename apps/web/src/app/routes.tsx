import { Navigate, type RouteObject } from "react-router-dom";

import { devToolsEnabled } from "../shared/devtools";

import { features } from "./features";
import { GroupGuard } from "./guards";
import { AppLayout } from "./layout/AppLayout";
import { DevKit } from "./pages/DevKit";
import { InstallGuide } from "./pages/InstallGuide";
import { Placeholder } from "./pages/Placeholder";
import { SampleForm } from "./pages/SampleForm";

/** Wraps a group's pages: guard first (stub until M1-P2), then the group layout. */
function group(
  path: string,
  guard: "auth" | "app" | "platform" | "parent",
  pages: RouteObject[],
): RouteObject {
  return {
    path,
    element: <GroupGuard group={guard} />,
    children: [{ element: <AppLayout />, children: pages }],
  };
}

type Group = "auth" | "app" | "platform" | "parent";
const GROUP_RE = /^\/(auth|app|platform|parent)(?:\/(.*))?$/;

/**
 * Splits feature routes by the route group in their absolute `path` and makes each path
 * relative to its group, so the group's guard and layout wrap it.
 */
export function partitionFeatureRoutes(
  routes: readonly RouteObject[],
): Record<Group, RouteObject[]> {
  const out: Record<Group, RouteObject[]> = { auth: [], app: [], platform: [], parent: [] };
  for (const route of routes) {
    const match = typeof route.path === "string" ? GROUP_RE.exec(route.path) : null;
    if (!match) {
      throw new Error(
        `Feature route path must start with /auth, /app, /platform or /parent (got ${JSON.stringify(route.path)})`,
      );
    }
    const rest = match[2] ?? "";
    const { path: _path, ...others } = route;
    out[match[1] as Group].push(
      (rest === "" ? { ...others, index: true } : { ...others, path: rest }) as RouteObject,
    );
  }
  return out;
}

/**
 * The shell's route table. Groups: /auth/*, /app/* (staff), /platform/* (platform console),
 * /parent/* (guardian). Feature routes are merged in by step 2.
 */
export function createShellRoutes(
  featureRoutes: readonly RouteObject[] = features.routes,
): RouteObject[] {
  const extra = partitionFeatureRoutes(featureRoutes);
  return [
    { path: "/", element: <Navigate to="/app" replace /> },
    group("/auth", "auth", [
      { index: true, element: <Navigate to="login" replace /> },
      { path: "login", element: <Placeholder name="home" /> },
      ...extra.auth,
    ]),
    group("/app", "app", [{ index: true, element: <Placeholder name="home" /> }, ...extra.app]),
    group("/platform", "platform", [
      { index: true, element: <Placeholder name="home" /> },
      ...extra.platform,
    ]),
    group("/parent", "parent", [
      { index: true, element: <Placeholder name="home" /> },
      ...extra.parent,
    ]),
    {
      path: "/install",
      element: <AppLayout />,
      children: [{ index: true, element: <InstallGuide /> }],
    },
    ...(devToolsEnabled
      ? [
          {
            path: "/dev",
            element: <AppLayout />,
            children: [
              { path: "kit", element: <DevKit /> },
              { path: "form", element: <SampleForm /> },
            ],
          },
        ]
      : []),
    { path: "*", element: <Navigate to="/" replace /> },
  ];
}
