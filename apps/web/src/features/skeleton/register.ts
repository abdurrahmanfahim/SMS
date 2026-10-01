import type { RouteObject } from "react-router-dom";

import type { NavItem } from "../../shared/nav";

import { skeletonRoutes } from "./skeleton-routes";

/**
 * Walking-skeleton screens (M0-P3). M1-W2 replaces and removes this whole feature.
 * `/app` is registered as the dashboard contract, but the shell's own `/app` placeholder
 * is declared first and currently wins; `/app/dashboard` is the path that works today
 * (see docs/reports/M0-P3.md, Requests).
 */
export const routes: RouteObject[] = skeletonRoutes;

export const navItems: NavItem[] = [];
