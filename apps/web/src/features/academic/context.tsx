import type { SmsClient } from "@sms/db";
import { createSmsClientFromEnv } from "@sms/db";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useT } from "../../shared/i18n";

import { createSupabaseRepository, type AcademicRepository } from "./data/repository";

export interface AcademicContextValue {
  repo: AcademicRepository;
  /**
   * Whether to show edit controls. A display hint only: Postgres (RLS) is what actually decides,
   * so a wrong value can never let someone write, only show or hide buttons.
   */
  canWrite: boolean;
}

const AcademicContext = createContext<AcademicContextValue | null>(null);

export function AcademicProvider({
  value,
  children,
}: {
  value: AcademicContextValue;
  children: ReactNode;
}) {
  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
}

export function useAcademic(): AcademicContextValue {
  const value = useContext(AcademicContext);
  if (value === null) throw new Error("useAcademic must be used inside AcademicProvider");
  return value;
}

type Resolved =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "signed_out" }
  | { status: "no_institution" }
  | { status: "error" }
  | { status: "ready"; value: AcademicContextValue };

/**
 * Finds the signed-in person's institution and builds the repository. Until the shell provides a
 * shared session (M1-W2), the institution is the person's first active membership and edit
 * controls show for institution admins. See docs/reports/M1-A1.md (Requests).
 */
export function useResolvedAcademic(getClient: () => SmsClient = createSmsClientFromEnv): Resolved {
  const [state, setState] = useState<Resolved>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let client: SmsClient;
      try {
        client = getClient();
      } catch {
        return { status: "unconfigured" } as const;
      }
      const { data: auth } = await client.auth.getUser();
      if (auth.user === null) return { status: "signed_out" } as const;
      const { data, error } = await client
        .from("memberships")
        .select("institution_id, role")
        .eq("profile_id", auth.user.id)
        .eq("status", "active");
      if (error) return { status: "error" } as const;
      const first = data[0];
      if (first === undefined) return { status: "no_institution" } as const;
      const canWrite = data.some(
        (m) => m.institution_id === first.institution_id && m.role === "institution_admin",
      );
      return {
        status: "ready",
        value: { repo: createSupabaseRepository(client, first.institution_id), canWrite },
      } as const;
    };
    run()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [getClient]);
  return state;
}

/** Route root: resolves the institution once and renders the academic screens inside the provider. */
export function AcademicRoot({
  children,
  getClient,
}: {
  children: ReactNode;
  getClient?: () => SmsClient;
}) {
  const t = useT();
  const resolved = useResolvedAcademic(getClient);
  const messageKey = useMemo(() => {
    switch (resolved.status) {
      case "unconfigured":
        return "academic.state.unconfigured";
      case "signed_out":
        return "academic.state.signedOut";
      case "no_institution":
        return "academic.state.noInstitution";
      case "error":
        return "academic.state.error";
      default:
        return null;
    }
  }, [resolved.status]);
  if (resolved.status === "loading") return <p role="status">{t("common.state.loading")}</p>;
  if (resolved.status !== "ready")
    return <p role="alert">{t(messageKey ?? "academic.state.error")}</p>;
  return <AcademicProvider value={resolved.value}>{children}</AcademicProvider>;
}
