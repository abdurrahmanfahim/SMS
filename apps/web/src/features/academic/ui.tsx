import { Button, EmptyState, ErrorState, Select, Sheet, Skeleton } from "@sms/ui";
import { ChevronLeft } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { formatDate } from "../../shared/format";
import { useLocale, useT } from "../../shared/i18n";

import { toAcademicError, type AcademicErrorKey } from "./data/errors";
import type { YearRow } from "./data/types";
import type { Resource } from "./hooks";

export const ACADEMIC_HOME = "/app/academic";

/** Name in the person's language, falling back to the other language. */
export function useDisplayName() {
  const locale = useLocale();
  return useCallback(
    (row: { name_bn: string | null; name_en: string | null }): string => {
      const first = locale === "bn" ? row.name_bn : row.name_en;
      const second = locale === "bn" ? row.name_en : row.name_bn;
      return first?.trim() || second?.trim() || "";
    },
    [locale],
  );
}

export function PageHeader({ titleKey, back = true }: { titleKey: string; back?: boolean }) {
  const t = useT();
  return (
    <header className="mb-4 flex flex-col gap-2">
      {back ? (
        <Link
          to={ACADEMIC_HOME}
          className="inline-flex min-h-tap items-center gap-1 text-primary underline"
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
          {t("academic.nav.back")}
        </Link>
      ) : null}
      <h1 className="m-0 text-2xl font-semibold">{t(titleKey)}</h1>
    </header>
  );
}

export function ReadOnlyNote() {
  const t = useT();
  return (
    <p className="mb-3 rounded-md border border-line-strong bg-surface-subtle p-3" role="note">
      {t("academic.state.readOnly")}
    </p>
  );
}

/** Loading skeleton, error with retry, or the content. `isEmpty` swaps in the empty state. */
export function Loadable<T>({
  resource,
  isEmpty,
  emptyTitleKey,
  emptyDescriptionKey,
  emptyAction,
  children,
}: {
  resource: Resource<T>;
  isEmpty?: (data: T) => boolean;
  emptyTitleKey: string;
  emptyDescriptionKey?: string;
  emptyAction?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const t = useT();
  if (resource.status === "loading") {
    return (
      <div role="status" aria-label={t("common.state.loading")} className="flex flex-col gap-3">
        <Skeleton label={t("common.state.loading")} className="h-16" />
        <Skeleton label={t("common.state.loading")} className="h-16" />
      </div>
    );
  }
  if (resource.status === "error") {
    return (
      <ErrorState
        title={t("academic.state.loadFailed")}
        description={t(resource.error.key)}
        action={<Button onClick={resource.reload}>{t("academic.action.retry")}</Button>}
      />
    );
  }
  if (isEmpty?.(resource.data)) {
    return (
      <EmptyState
        title={t(emptyTitleKey)}
        description={emptyDescriptionKey ? t(emptyDescriptionKey) : undefined}
        action={emptyAction}
      />
    );
  }
  return <>{children(resource.data)}</>;
}

/** Runs a change (create, delete, ...) and keeps the translated error for the screen. */
export function useAction(onDone: () => void) {
  const [error, setError] = useState<AcademicErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await action();
        onDone();
        return true;
      } catch (caught) {
        setError(toAcademicError(caught).key);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone],
  );
  return { run, error, busy, clearError: () => setError(null) };
}

export function ErrorLine({ errorKey }: { errorKey: AcademicErrorKey | null }) {
  const t = useT();
  if (errorKey === null) return null;
  return (
    <p role="alert" className="m-0 font-medium text-danger">
      {t(errorKey)}
    </p>
  );
}

/** A sheet that holds one form; closing it clears the error. */
export function FormSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      closeLabel={t("common.action.close")}
    >
      {children}
    </Sheet>
  );
}

export function YearSelect({
  years,
  value,
  onChange,
}: {
  years: YearRow[];
  value: string;
  onChange: (id: string) => void;
}) {
  const t = useT();
  const name = useDisplayName();
  return (
    <Select
      label={t("academic.field.year")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={years.map((y) => ({ value: y.id, label: name(y) }))}
      errorPrefix={t("common.state.error")}
    />
  );
}

/** The current year if there is one, else the newest. Empty string when there are no years. */
export function defaultYearId(years: YearRow[]): string {
  return (years.find((y) => y.is_current) ?? years[0])?.id ?? "";
}

export function yearDates(year: Pick<YearRow, "starts_on" | "ends_on">): string {
  const day = (iso: string) => formatDate(new Date(`${iso}T00:00:00Z`));
  return `${day(year.starts_on)} – ${day(year.ends_on)}`;
}
