import { Outlet } from "react-router-dom";

import { AcademicRoot } from "./context";

/** Parent route element: resolves the institution once, then renders the screen. Loaded lazily. */
export function AcademicShell() {
  return (
    <AcademicRoot>
      <Outlet />
    </AcademicRoot>
  );
}
