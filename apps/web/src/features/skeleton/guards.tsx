import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { PageLoading } from "../../app/patterns/PageLoading";
import { useT } from "../../shared/i18n";

import { useSession, type SessionState } from "./session";

export const SIGN_IN_PATH = "/auth/sign-in";
export const PICKER_PATH = "/auth/pick-institution";
export const DASHBOARD_PATH = "/app/dashboard";

/** Where a signed-in user belongs: the dashboard, or the picker when no institution is chosen. */
export function homeFor(state: SessionState): string {
  if (state.status !== "signed_in") return SIGN_IN_PATH;
  return state.activeInstitutionId === null && state.institutions.length > 0
    ? PICKER_PATH
    : DASHBOARD_PATH;
}

/**
 * Route guard for skeleton pages. The shell's group guards are stubs until M1-P2, so the guard
 * lives here: signed-out visitors go to sign-in, and pages that need an institution send users
 * without one to the picker.
 */
export function RequireSession({
  children,
  needInstitution,
}: {
  children: ReactNode;
  needInstitution: boolean;
}) {
  const t = useT();
  const session = useSession();
  if (session.status === "loading") return <PageLoading />;
  if (session.status === "unconfigured")
    return <p role="alert">{t("skeleton.state.unconfigured")}</p>;
  if (session.status === "signed_out") return <Navigate to={SIGN_IN_PATH} replace />;
  if (needInstitution && session.activeInstitutionId === null && session.institutions.length > 0) {
    return <Navigate to={PICKER_PATH} replace />;
  }
  return <>{children}</>;
}

/** Sign-in page wrapper: people who are already signed in skip it. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const t = useT();
  const session = useSession();
  if (session.status === "loading") return <PageLoading />;
  if (session.status === "unconfigured")
    return <p role="alert">{t("skeleton.state.unconfigured")}</p>;
  if (session.status === "signed_in") return <Navigate to={homeFor(session)} replace />;
  return <>{children}</>;
}
