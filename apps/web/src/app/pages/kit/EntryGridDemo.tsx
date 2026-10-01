import { Button, Select } from "@sms/ui";
import { useMemo, useState } from "react";

import {
  EntryGrid,
  SaveStateIndicator,
  type EntryColumn,
  type EntryRow,
} from "../../../shared/entry-grid";
import { useT } from "../../../shared/i18n";

import { makeStudents } from "./demoData";

const SUBJECTS = 10;

/** Dev kit demo: 100 students x 12 fields. Saving is faked (400 ms); the toggle makes it fail. */
export function EntryGridDemo() {
  const t = useT();
  const [fail, setFail] = useState(false);
  const [active, setActive] = useState("");
  const [saved, setSaved] = useState(0);

  const columns = useMemo<EntryColumn[]>(
    () => [
      ...Array.from({ length: SUBJECTS }, (_, i): EntryColumn => ({
        id: `sub${i + 1}`,
        label: t("devkit.kit.entrySubject", { n: i + 1 }),
        type: "number",
        min: 0,
        max: 100,
      })),
      {
        id: "att",
        label: t("devkit.kit.entryAttendance"),
        type: "code",
        codes: [
          { value: "AB", label: t("devkit.kit.entryAbsent") },
          { value: "LV", label: t("devkit.kit.leave") },
        ],
      },
      { id: "note", label: t("devkit.kit.entryNote"), type: "text", maxLength: 20, width: 140 },
    ],
    [t],
  );
  const rows = useMemo<EntryRow[]>(
    () =>
      makeStudents(100).map((s) => ({
        id: s.id,
        label: s.name,
        values: (s.id === "s1" ? { sub1: "85" } : {}) as Record<string, string>,
      })),
    [],
  );

  const commit = (): Promise<void> =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        if (fail) reject(new Error("demo failure"));
        else {
          setSaved((n) => n + 1);
          resolve();
        }
      }, 400),
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t("devkit.kit.entryColumn")}
          value={active}
          onChange={(e) => setActive(e.target.value)}
          options={[
            { value: "", label: t("devkit.kit.entryAllFields") },
            ...columns.map((c) => ({ value: c.id, label: c.label })),
          ]}
        />
        <Button variant="secondary" aria-pressed={fail} onClick={() => setFail((f) => !f)}>
          {fail ? t("devkit.kit.entryFailOn") : t("devkit.kit.entryFailOff")}
        </Button>
      </div>
      <p className="m-0 text-sm text-content-secondary" role="status">
        {t("devkit.kit.entrySaved", { count: saved })}
      </p>
      <EntryGrid
        label={t("devkit.kit.entryGridLabel")}
        rowHeader={t("devkit.kit.colName")}
        statusHeader={t("devkit.kit.entryStatus")}
        columns={columns}
        rows={rows}
        activeColumnId={active || undefined}
        onCellCommit={commit}
      />
      <div className="flex flex-col gap-1">
        <p className="m-0 text-sm font-medium">{t("devkit.kit.entryStates")}</p>
        <div className="flex flex-wrap gap-4">
          <SaveStateIndicator state={{ status: "saved" }} />
          <SaveStateIndicator state={{ status: "saving" }} />
          <SaveStateIndicator state={{ status: "pending", count: 3 }} />
          <SaveStateIndicator state={{ status: "error" }} />
        </div>
      </div>
    </div>
  );
}
