import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { devToolsEnabled } from "../../shared/devtools";
import { useT } from "../../shared/i18n";
import { navItemsForRole } from "../../shared/nav";
import { useRole } from "../../shared/role";
import { allNavItems } from "../nav";
import { ErrorBoundary } from "../patterns/ErrorBoundary";
import { PageLoading } from "../patterns/PageLoading";
import { OfflineNotice } from "../pwa/OfflineNotice";
import { UpdatePrompt } from "../pwa/UpdatePrompt";

import { HelpButton } from "./HelpButton";
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
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("main");
          main?.focus();
          main?.scrollIntoView?.();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-tooltip focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-fg"
      >
        {t("shell.a11y.skip")}
      </a>
      <header className="sticky top-0 z-sticky border-b border-line bg-surface px-4 py-2">
        {/* One fixed row: it must never wrap, or a font swap would push the whole page down (CLS). */}
        <div className="flex flex-nowrap items-center justify-between gap-2">
          <span className="shrink-0 text-lg font-semibold">{t("shell.brand.name")}</span>
          <div className="flex min-w-0 items-center gap-2">
            <LanguageSwitcher />
            <HelpButton />
          </div>
        </div>
        {devToolsEnabled ? (
          <div className="mt-2">
            <RoleSwitcher />
          </div>
        ) : null}
      </header>
      <OfflineNotice />
      <div className="flex flex-1">
        <Sidebar items={items} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-4 pb-24 md:pb-4">
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <BottomTabBar items={items} />
      <UpdatePrompt />
    </div>
  );
}
