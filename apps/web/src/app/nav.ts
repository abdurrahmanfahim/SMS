import { House } from "lucide-react";

import type { NavItem } from "../shared/nav";

import { features } from "./features";

/** Shell-owned nav items: one Home per route group. Features add the rest. */
export const coreNavItems: NavItem[] = [
  {
    key: "core.home.app",
    labelKey: "shell.nav.home",
    icon: House,
    path: "/app",
    roles: ["institution_admin", "teacher", "accountant"],
    order: 0,
  },
  {
    key: "core.home.platform",
    labelKey: "shell.nav.home",
    icon: House,
    path: "/platform",
    roles: ["platform_owner"],
    order: 0,
  },
  {
    key: "core.home.parent",
    labelKey: "shell.nav.home",
    icon: House,
    path: "/parent",
    roles: ["guardian", "student"],
    order: 0,
  },
];

/** Every nav item the shell knows about, before filtering by role. */
export const allNavItems: NavItem[] = [...coreNavItems, ...features.navItems];
