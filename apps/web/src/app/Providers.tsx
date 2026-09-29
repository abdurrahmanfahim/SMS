import { ToastProvider } from "@sms/ui";
import type { ReactNode } from "react";

import { useT } from "../shared/i18n";

/** App-wide providers that need translated labels (they follow the language switch). */
export function UiProviders({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <ToastProvider
      closeLabel={t("common.action.close")}
      viewportLabel={t("common.label.notifications")}
    >
      {children}
    </ToastProvider>
  );
}
