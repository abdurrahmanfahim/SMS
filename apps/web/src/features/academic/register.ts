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

export const navItems: NavItem[] = [
  {
    key: "academic.home",
    labelKey: "academic.nav.title",
    icon: GraduationCap,
    path: "/app/academic",
    roles: ["institution_admin", "teacher", "accountant"],
    order: 40,
  },
];
