import type { ComponentType } from "react";

import type { Role } from "./roles";

/** Any icon component that accepts a class name (lucide-react icons qualify). */
export type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

/**
 * One entry of the navigation. Navigation is data: features contribute NavItems from their
 * `register.ts`, the shell filters them by the current role and renders them as a bottom tab
 * bar (phone) or a sidebar (desktop).
 */
export interface NavItem {
  /** Unique across the whole app, `feature.section` style, e.g. `students.list`. */
  key: string;
  /** i18n key of the visible label (always shown, never icon-only). */
  labelKey: string;
  icon: IconComponent;
  /** Absolute path, e.g. `/app/students`. */
  path: string;
  /** Roles that see the item. */
  roles: Role[];
  /** Sort position, lower first. Defaults to 100. Ties keep registration order. */
  order?: number;
}

/** Bottom tab bar limit from docs/spec/ux-standard.md section 2. */
export const MAX_TAB_ITEMS = 5;

const DEFAULT_ORDER = 100;

/** Items visible to `role`, sorted by `order` (stable). A null role sees nothing. */
export function navItemsForRole(items: readonly NavItem[], role: Role | null): NavItem[] {
  if (role === null) return [];
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.roles.includes(role))
    .sort(
      (a, b) =>
        (a.item.order ?? DEFAULT_ORDER) - (b.item.order ?? DEFAULT_ORDER) || a.index - b.index,
    )
    .map(({ item }) => item);
}
