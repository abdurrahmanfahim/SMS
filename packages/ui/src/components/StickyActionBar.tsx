import type { ReactNode } from "react";

/**
 * Bottom action bar for forms: the primary action stays reachable while the on-screen keyboard is
 * open. Positioned by `phone.css` (import "@sms/ui/phone.css") using the keyboard inset that the
 * app keeps on <html>; never plain `position: fixed; bottom: 0`. Buttons inside are at least 44px
 * high (Button size md). A spacer keeps the last field from hiding behind the bar.
 */
export function StickyActionBar({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <>
      <div className="sms-action-bar-spacer" aria-hidden="true" />
      <div role="group" aria-label={ariaLabel} className="sms-action-bar">
        {children}
      </div>
    </>
  );
}
