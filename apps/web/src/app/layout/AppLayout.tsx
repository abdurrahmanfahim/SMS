import { Outlet } from "react-router-dom";

import { devToolsEnabled } from "../../shared/devtools";
import { useT } from "../../shared/i18n";
import { navItemsForRole } from "../../shared/nav";
import { useRole } from "../../shared/role";
import { allNavItems } from "../nav";

import { BottomTabBar, Sidebar } from "./NavLinks";
import { LanguageSwitcher, RoleSwitcher } from "./Switchers";

/**
 * The shell layout shared by every route group: header (brand, language, dev role switcher),
 * role-filtered navigation (bottom tab bar on phones, sidebar from 768px) and the page area.
 */
export function AppLayout() {
  const t = useT();
  const { role } = useRole();
  const items = navItemsForRole(allNavItems, role);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-sticky flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2">
        <span className="text-lg font-semibold">{t("shell.brand.name")}</span>
        <LanguageSwitcher />
        {devToolsEnabled ? <RoleSwitcher /> : null}
      </header>
      <div className="flex flex-1">
        <Sidebar items={items} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-4 pb-24 md:pb-4">
          <Outlet />
        </main>
      </div>
      <BottomTabBar items={items} />
    </div>
  );
}
