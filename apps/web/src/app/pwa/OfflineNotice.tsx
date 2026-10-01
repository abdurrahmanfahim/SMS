import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useT } from "../../shared/i18n";

function subscribe(listener: () => void): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** True while the browser reports no connection. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Non-blocking notice shown while offline (icon and text, never colour alone). */
export function OfflineNotice() {
  const t = useT();
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      data-testid="offline-notice"
      className="sms-no-print flex items-center gap-2 border-b-2 border-warning bg-surface-subtle px-4 py-2"
    >
      <WifiOff aria-hidden className="h-5 w-5 shrink-0" />
      <span>{t("pwa.offline.message")}</span>
    </div>
  );
}
