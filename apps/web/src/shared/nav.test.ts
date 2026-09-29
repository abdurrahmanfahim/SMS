import { describe, expect, it } from "vitest";

import { navItemsForRole, type NavItem } from "./nav";
import { ROLES } from "./roles";

const Icon = () => null;
const item = (key: string, roles: NavItem["roles"], order?: number): NavItem => ({
  key,
  labelKey: key,
  icon: Icon,
  path: `/app/${key}`,
  roles,
  ...(order === undefined ? {} : { order }),
});

const items = [
  item("students", ["institution_admin", "teacher", "accountant"], 20),
  item("exams", ["institution_admin", "teacher"], 30),
  item("users", ["institution_admin"], 10),
  item("results", ["guardian"]),
  item("tenants", ["platform_owner"]),
];

describe("navItemsForRole", () => {
  it("shows only items whose roles include the role", () => {
    expect(navItemsForRole(items, "teacher").map((i) => i.key)).toEqual(["students", "exams"]);
    expect(navItemsForRole(items, "guardian").map((i) => i.key)).toEqual(["results"]);
    expect(navItemsForRole(items, "platform_owner").map((i) => i.key)).toEqual(["tenants"]);
  });

  it("sorts by order, keeping registration order for ties", () => {
    expect(navItemsForRole(items, "institution_admin").map((i) => i.key)).toEqual([
      "users",
      "students",
      "exams",
    ]);
    const tie = [item("b", ["teacher"]), item("a", ["teacher"])];
    expect(navItemsForRole(tie, "teacher").map((i) => i.key)).toEqual(["b", "a"]);
  });

  it("returns nothing for no role and for a role with no items", () => {
    expect(navItemsForRole(items, null)).toEqual([]);
    expect(navItemsForRole(items, "student")).toEqual([]);
  });

  it("does not mutate its input", () => {
    const copy = [...items];
    navItemsForRole(items, "institution_admin");
    expect(items).toEqual(copy);
  });

  it("every role gets a deterministic result", () => {
    for (const role of ROLES) {
      expect(navItemsForRole(items, role)).toEqual(navItemsForRole(items, role));
    }
  });
});
