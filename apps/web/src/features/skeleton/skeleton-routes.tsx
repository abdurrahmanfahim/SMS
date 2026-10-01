import type { RouteObject } from "react-router-dom";

import { RedirectIfSignedIn, RequireSession } from "./guards";
import { DashboardPage, PickInstitutionPage, SignInPage } from "./pages";

const dashboard = (
  <RequireSession needInstitution>
    <DashboardPage />
  </RequireSession>
);

export const skeletonRoutes: RouteObject[] = [
  {
    path: "/auth/sign-in",
    element: (
      <RedirectIfSignedIn>
        <SignInPage />
      </RedirectIfSignedIn>
    ),
  },
  {
    path: "/auth/pick-institution",
    element: (
      <RequireSession needInstitution={false}>
        <PickInstitutionPage />
      </RequireSession>
    ),
  },
  { path: "/app", element: dashboard },
  { path: "/app/dashboard", element: dashboard },
];
