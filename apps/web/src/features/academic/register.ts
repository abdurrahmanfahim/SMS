import { GraduationCap } from "lucide-react";
import { createElement, lazy } from "react";
import type { RouteObject } from "react-router-dom";

import type { NavItem } from "../../shared/nav";

// Every screen loads on demand, so the data client and the forms never reach the first bundle.
const AcademicShell = lazy(() => import("./shell").then((m) => ({ default: m.AcademicShell })));
const HubPage = lazy(() => import("./pages/HubPage").then((m) => ({ default: m.HubPage })));
const YearsPage = lazy(() => import("./pages/YearsPage").then((m) => ({ default: m.YearsPage })));
const LevelsPage = lazy(() =>
  import("./pages/LevelsPage").then((m) => ({ default: m.LevelsPage })),
);
const SectionsPage = lazy(() =>
  import("./pages/SectionsPage").then((m) => ({ default: m.SectionsPage })),
);
const SubjectsPage = lazy(() =>
  import("./pages/SubjectsPage").then((m) => ({ default: m.SubjectsPage })),
);
const ClassSubjectsPage = lazy(() =>
  import("./pages/ClassSubjectsPage").then((m) => ({ default: m.ClassSubjectsPage })),
);
const AssignmentsPage = lazy(() =>
  import("./pages/AssignmentsPage").then((m) => ({ default: m.AssignmentsPage })),
);
const PresetPage = lazy(() =>
  import("./pages/PresetPage").then((m) => ({ default: m.PresetPage })),
);

/**
 * Academic structure (M1-A1): years, class levels, sections, subjects, class subjects, teacher
 * assignments and presets. One parent route resolves the institution once for every screen.
 */
export const routes: RouteObject[] = [
  {
    path: "/app/academic",
    element: createElement(AcademicShell),
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

/** The nav entry for the academic screens (switched on by the Leader after M1-A1, ruling R-17). */
export const academicNavItem: NavItem = {
  key: "academic.home",
  labelKey: "academic.nav.title",
  icon: GraduationCap,
  path: "/app/academic",
  roles: ["institution_admin", "teacher", "accountant"],
  order: 40,
};

export const navItems: NavItem[] = [academicNavItem];
