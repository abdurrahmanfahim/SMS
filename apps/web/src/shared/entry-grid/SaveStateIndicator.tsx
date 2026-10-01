import { CircleAlert, CircleCheck, Clock, LoaderCircle } from "lucide-react";

import { formatNumber } from "../format";
import { useT } from "../i18n";

import type { RowSaveState } from "./types";

/** Saved, Saving, Pending n or Error. Always an icon and a word, never colour alone. */
export function SaveStateIndicator({ state }: { state: RowSaveState | undefined }) {
  const t = useT();
  if (!state) return <span aria-hidden="true" />;
  const common = "inline-flex items-center gap-1 text-sm font-medium";
  switch (state.status) {
    case "saved":
      return (
        <span className={`${common} text-content-secondary`} data-save-state="saved">
          <CircleCheck aria-hidden className="h-4 w-4 shrink-0" />
          {t("entryGrid.state.saved")}
        </span>
      );
    case "saving":
      return (
        <span className={`${common} text-content-secondary`} data-save-state="saving">
          <LoaderCircle aria-hidden className="h-4 w-4 shrink-0 animate-spin" />
          {t("entryGrid.state.saving")}
        </span>
      );
    case "pending":
      return (
        <span className={`${common} text-content`} data-save-state="pending">
          <Clock aria-hidden className="h-4 w-4 shrink-0" />
          {t("entryGrid.state.pending", { count: formatNumber(state.count) })}
        </span>
      );
    case "error":
      return (
        <span className={`${common} text-danger`} data-save-state="error">
          <CircleAlert aria-hidden className="h-4 w-4 shrink-0" />
          {t("entryGrid.state.error")}
        </span>
      );
  }
}
