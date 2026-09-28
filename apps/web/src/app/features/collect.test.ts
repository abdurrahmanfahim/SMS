import { describe, expect, it } from "vitest";

import type { NavItem } from "../../shared/nav";

import { collectFeatures, flattenMessages } from "./collect";

const Icon = () => null;
const nav = (key: string, over: Partial<NavItem> = {}): NavItem => ({
  key,
  labelKey: `${key}.label`,
  icon: Icon,
  path: "/app/x",
  roles: ["teacher"],
  ...over,
});
const Widget = () => null;

describe("collectFeatures", () => {
  it("returns empty collections for an empty module map", () => {
    expect(collectFeatures({})).toEqual({
      routes: [],
      navItems: [],
      widgets: [],
      translations: { bn: {}, en: {} },
    });
  });

  it("merges routes, nav items, widgets and translations from fake modules", () => {
    const modules = {
      "/src/features/students/register.ts": {
        routes: [{ path: "/app/students" }],
        navItems: [nav("students.list")],
        widgets: [{ key: "students.card", roles: ["teacher"], Component: Widget }],
      },
      "/src/features/students/i18n/bn.json": {
        default: { students: { list: { title: "শিক্ষার্থী" } } },
      },
      "/src/features/students/i18n/en.json": {
        default: { students: { list: { title: "Students" } } },
      },
      "/src/features/exams/register.ts": {
        routes: [{ path: "/app/exams" }, { path: "/parent/exams" }],
        navItems: [nav("exams.list", { roles: ["institution_admin"] })],
      },
      "/src/features/exams/i18n/bn.json": { "exams.list.title": "পরীক্ষা" },
      "/src/features/exams/i18n/en.json": { "exams.list.title": "Exams" },
    };
    const out = collectFeatures(modules);

    // sorted path order: exams before students
    expect(out.routes.map((r) => r.path)).toEqual(["/app/exams", "/parent/exams", "/app/students"]);
    expect(out.navItems.map((n) => n.key)).toEqual(["exams.list", "students.list"]);
    expect(out.widgets.map((w) => w.key)).toEqual(["students.card"]);
    expect(out.translations.bn).toEqual({
      "exams.list.title": "পরীক্ষা",
      "students.list.title": "শিক্ষার্থী",
    });
    expect(out.translations.en["students.list.title"]).toBe("Students");
  });

  it("ignores files that are not register.ts or i18n json", () => {
    const out = collectFeatures({ "/src/features/x/other.ts": { routes: [{ path: "/app/x" }] } });
    expect(out.routes).toEqual([]);
  });

  it("throws on duplicate nav keys", () => {
    expect(() =>
      collectFeatures({
        "/src/features/a/register.ts": { routes: [], navItems: [nav("dup")] },
        "/src/features/b/register.ts": { routes: [], navItems: [nav("dup")] },
      }),
    ).toThrow(/duplicate nav item key "dup"/);
  });

  it("throws when two features define the same translation key", () => {
    expect(() =>
      collectFeatures({
        "/src/features/a/i18n/bn.json": { "shared.key": "ক" },
        "/src/features/b/i18n/bn.json": { "shared.key": "খ" },
      }),
    ).toThrow(/already defined by feature "a"/);
  });

  it("rejects a routes field that is not an array", () => {
    expect(() =>
      collectFeatures({ "/src/features/a/register.ts": { routes: {}, navItems: [] } }),
    ).toThrow(/"routes" must be an array/);
  });
});

describe("flattenMessages", () => {
  it("flattens nested objects with dotted keys", () => {
    expect(flattenMessages({ a: { b: "x", c: { d: "y" } }, e: "z" })).toEqual({
      "a.b": "x",
      "a.c.d": "y",
      e: "z",
    });
  });

  it("rejects non-string leaves", () => {
    expect(() => flattenMessages({ a: 1 })).toThrow(/must be a string/);
  });
});
