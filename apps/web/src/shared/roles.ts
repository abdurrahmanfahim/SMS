/** The six platform roles. Replaced by generated types once the database schema lands. */
export type Role =
  "platform_owner" | "institution_admin" | "teacher" | "accountant" | "guardian" | "student";

export const ROLES: readonly Role[] = [
  "platform_owner",
  "institution_admin",
  "teacher",
  "accountant",
  "guardian",
  "student",
];

/** Route groups of the shell. Each role lives in exactly one group. */
export type RouteGroup = "app" | "platform" | "parent";

/**
 * Staff roles use `/app`, the platform owner uses `/platform`, guardians use `/parent`.
 * The student role has no screens in v1 (guardians act on a student's behalf), so it is
 * mapped to the `/parent` group as the only read-only family-facing area.
 */
export function roleGroup(role: Role): RouteGroup {
  switch (role) {
    case "platform_owner":
      return "platform";
    case "guardian":
    case "student":
      return "parent";
    case "institution_admin":
    case "teacher":
    case "accountant":
      return "app";
  }
}

/** Home path of a role. */
export function roleHome(role: Role): string {
  return `/${roleGroup(role)}`;
}
