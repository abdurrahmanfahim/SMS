import { Skeleton } from "@sms/ui";

import { useT } from "../../shared/i18n";

/** Suspense fallback and generic loading state: skeleton shapes plus a spoken label. */
export function PageLoading() {
  const t = useT();
  return (
    <div className="flex max-w-2xl flex-col gap-4" data-testid="page-loading">
      <Skeleton label={t("common.state.loading")} lines={1} className="h-8 w-1/2" />
      <Skeleton label={t("common.state.loading")} lines={4} />
    </div>
  );
}
