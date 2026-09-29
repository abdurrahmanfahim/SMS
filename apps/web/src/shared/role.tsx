import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { devToolsEnabled } from "./devtools";
import { ROLES, type Role } from "./roles";

const DEV_ROLE_KEY = "sms.dev.role";

interface RoleState {
  role: Role | null;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleState>({ role: null, setRole: () => undefined });

function initialRole(): Role {
  if (devToolsEnabled) {
    try {
      const stored = globalThis.localStorage?.getItem(DEV_ROLE_KEY);
      const found = ROLES.find((r) => r === stored);
      if (found) return found;
    } catch {
      /* ignore blocked storage */
    }
  }
  return "institution_admin";
}

/**
 * Stub session: there is no sign-in yet (M1-P2), so the current role is fixed to
 * `institution_admin` unless the dev role switcher overrides it.
 */
export function RoleProvider({ children, role: fixed }: { children: ReactNode; role?: Role }) {
  const [role, setRoleState] = useState<Role>(fixed ?? initialRole);
  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    if (devToolsEnabled) {
      try {
        globalThis.localStorage?.setItem(DEV_ROLE_KEY, next);
      } catch {
        /* ignore blocked storage */
      }
    }
  }, []);
  const value = useMemo(() => ({ role, setRole }), [role, setRole]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleState {
  return useContext(RoleContext);
}
