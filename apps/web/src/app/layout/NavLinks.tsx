import { NavLink } from "react-router-dom";

import { useT } from "../../shared/i18n";
import { MAX_TAB_ITEMS, type NavItem } from "../../shared/nav";

/** Phone: bottom tab bar, at most 5 items, icon plus always-visible label. */
export function BottomTabBar({ items }: { items: NavItem[] }) {
  const t = useT();
  return (
    <nav
      aria-label={t("shell.nav.label")}
      className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="m-0 flex list-none p-0">
        {items.slice(0, MAX_TAB_ITEMS).map((item) => (
          <li key={item.key} className="min-w-0 flex-1">
            <NavLink
              to={item.path}
              end
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-xs ${
                  isActive ? "font-semibold text-primary" : "text-content-secondary"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon aria-hidden className="h-5 w-5" />
                  <span className="max-w-full truncate">{t(item.labelKey)}</span>
                  {isActive ? (
                    <span className="h-0.5 w-6 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Desktop: fixed 240px sidebar with the same items in the same order. */
export function Sidebar({ items }: { items: NavItem[] }) {
  const t = useT();
  return (
    <nav
      aria-label={t("shell.nav.label")}
      className="hidden w-[240px] shrink-0 border-r border-line bg-surface-subtle md:block"
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-4">
        {items.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.path}
              end
              className={({ isActive }) =>
                `flex min-h-tap items-center gap-3 rounded-md px-3 ${
                  isActive
                    ? "bg-primary font-semibold text-primary-fg"
                    : "text-content hover:bg-surface"
                }`
              }
            >
              <item.icon aria-hidden className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
