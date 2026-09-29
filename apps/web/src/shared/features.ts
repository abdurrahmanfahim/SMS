import type { ComponentType } from "react";
import type { RouteObject } from "react-router-dom";

import type { NavItem } from "./nav";
import type { Role } from "./roles";

/** A card a feature contributes to a role's home screen. */
export interface HomeWidget {
  key: string;
  roles: Role[];
  /** Sort position, lower first. Defaults to 100. */
  order?: number;
  Component: ComponentType;
}

/**
 * What every `apps/web/src/features/<name>/register.ts` exports (as named exports).
 * The shell discovers these files by glob; feature tasks never edit shell files.
 *
 * Route `path` values are absolute and start with the route group they belong to:
 * `/app/...`, `/platform/...`, `/parent/...` or `/auth/...`.
 */
export interface FeatureRegistration {
  routes: RouteObject[];
  navItems: NavItem[];
  widgets?: HomeWidget[];
}
