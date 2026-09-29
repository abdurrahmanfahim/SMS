import { Outlet } from "react-router-dom";

import type { RouteGroup } from "../shared/roles";

/**
 * Route guard for a route group. This is a stub: it lets every visitor through.
 * Real session and role checks arrive with M1-P2; the group prop is already passed so
 * the call sites do not change then.
 */
export function GroupGuard(_props: { group: RouteGroup | "auth" }) {
  return <Outlet />;
}
