import { Button } from "@sms/ui";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useT } from "../../shared/i18n";

/** Presentational part: banner with "update" and "later". */
export function UpdatePromptView({
  visible,
  onUpdate,
  onDismiss,
}: {
  visible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-toast mx-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-raised p-3 shadow-lg md:bottom-4 md:left-auto md:w-[24rem]"
    >
      <p className="m-0 flex-1">{t("pwa.update.message")}</p>
      <Button size="sm" onClick={onUpdate}>
        {t("pwa.update.action")}
      </Button>
      <Button size="sm" variant="secondary" onClick={onDismiss}>
        {t("pwa.update.later")}
      </Button>
    </div>
  );
}

/** Registers the service worker and asks before applying a new version. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  return (
    <UpdatePromptView
      visible={needRefresh}
      onUpdate={() => void updateServiceWorker(true)}
      onDismiss={() => setNeedRefresh(false)}
    />
  );
}
