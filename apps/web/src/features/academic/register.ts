import { GraduationCap } from "lucide-react";
import { createElement } from "react";
import { Outlet, type RouteObject } from "react-router-dom";

import type { NavItem } from "../../shared/nav";

import { AcademicRoot } from "./context";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { ClassSubjectsPage } from "./pages/ClassSubjectsPage";
import { HubPage } from "./pages/HubPage";
import { LevelsPage } from "./pages/LevelsPage";
import { PresetPage } from "./pages/PresetPage";
import { SectionsPage } from "./pages/SectionsPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { YearsPage } from "./pages/YearsPage";

/**
 * Academic structure (M1-A1): years, class levels, sections, subjects, class subjects, teacher
 * assignments and presets. One parent route resolves the institution once for every screen.
 */
export const routes: RouteObject[] = [
  {
    path: "/app/academic",
    element: createElement(AcademicRoot, null, createElement(Outlet)),
    children: [
      { index: true, element: createElement(HubPage) },
      { path: "years", element: createElement(YearsPage) },
      { path: "levels", element: createElement(LevelsPage) },
      { path: "sections", element: createElement(SectionsPage) },
      { path: "subjects", element: createElement(SubjectsPage) },
      { path: "class-subjects", element: createElement(ClassSubjectsPage) },
      { path: "assignments", element: createElement(AssignmentsPage) },
      { path: "preset", element: createElement(PresetPage) },
    ],
  },
];

/**
 * The nav entry for the academic screens, ready to switch on. It is NOT registered yet because
 * `app/shell.test.tsx` ("shows the home nav item ...") asserts that each nav holds exactly one
 * link, so any feature nav item turns CI red, and that file is outside this task's owned paths.
 * Until the shell test allows feature items, the screens are reached at /app/academic.
 * To switch on: `export const navItems: NavItem[] = [academicNavItem];` (see docs/reports/M1-A1.md, Requests).
 */
export const academicNavItem: NavItem = {
  key: "academic.home",
  labelKey: "academic.nav.title",
  icon: GraduationCap,
  path: "/app/academic",
  roles: ["institution_admin", "teacher", "accountant"],
  order: 40,
};

export const navItems: NavItem[] = [];
