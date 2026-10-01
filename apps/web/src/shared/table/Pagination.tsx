import { Button, Select } from "@sms/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatNumber } from "../format";
import { useT } from "../i18n";

export interface PaginationProps {
  pageIndex: number;
  pageSize: number;
  total: number;
  onChange: (next: { pageIndex: number; pageSize: number }) => void;
  pageSizeOptions?: number[];
}

/** Previous and next buttons with a "from to / total" line and an optional page-size select. */
export function Pagination({
  pageIndex,
  pageSize,
  total,
  onChange,
  pageSizeOptions,
}: PaginationProps) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      data-testid="table-pagination"
    >
      <p className="m-0 text-sm text-content-secondary" aria-live="polite">
        {t("table.page.info", {
          from: formatNumber(from),
          to: formatNumber(to),
          total: formatNumber(total),
        })}
        {" · "}
        {t("table.page.of", { page: formatNumber(pageIndex + 1), pages: formatNumber(pages) })}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        {pageSizeOptions && pageSizeOptions.length > 1 ? (
          <Select
            label={t("table.page.size")}
            value={String(pageSize)}
            onChange={(e) => onChange({ pageIndex: 0, pageSize: Number(e.target.value) })}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: formatNumber(n) }))}
          />
        ) : null}
        <Button
          variant="secondary"
          disabled={pageIndex <= 0}
          leadingIcon={<ChevronLeft aria-hidden className="h-4 w-4" />}
          onClick={() => onChange({ pageIndex: pageIndex - 1, pageSize })}
        >
          {t("table.page.previous")}
        </Button>
        <Button
          variant="secondary"
          disabled={pageIndex >= pages - 1}
          leadingIcon={<ChevronRight aria-hidden className="h-4 w-4" />}
          onClick={() => onChange({ pageIndex: pageIndex + 1, pageSize })}
        >
          {t("table.page.next")}
        </Button>
      </div>
    </div>
  );
}
