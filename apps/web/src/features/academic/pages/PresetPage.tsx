import { Button, Card } from "@sms/ui";
import { useState } from "react";
import { Link } from "react-router-dom";

import { formatNumber } from "../../../shared/format";
import { useT } from "../../../shared/i18n";
import { useAcademic } from "../context";
import type { PresetResult } from "../data/repository";
import { useAcademicYears } from "../hooks";
import { PRESETS } from "../presets";
import { ErrorLine, Loadable, PageHeader, YearSelect, defaultYearId, useAction } from "../ui";

export function PresetPage() {
  const t = useT();
  const { repo, canWrite } = useAcademic();
  const years = useAcademicYears();
  const [presetId, setPresetId] = useState(PRESETS[0]?.id ?? "");
  const [chosenYear, setChosenYear] = useState("");
  const [result, setResult] = useState<PresetResult | null>(null);
  const action = useAction(() => undefined);

  if (!canWrite) {
    return (
      <div>
        <PageHeader titleKey="academic.preset.title" />
        <p role="alert">{t("academic.error.notAllowed")}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader titleKey="academic.preset.title" />
      <Loadable
        resource={years}
        isEmpty={(d) => d.length === 0}
        emptyTitleKey="academic.preset.noYears.title"
        emptyDescriptionKey="academic.preset.noYears.description"
        emptyAction={
          <Link to="/app/academic/years" className="text-primary underline">
            {t("academic.preset.noYears.action")}
          </Link>
        }
      >
        {(rows) => {
          const yearId = rows.some((y) => y.id === chosenYear) ? chosenYear : defaultYearId(rows);
          const preset = PRESETS.find((p) => p.id === presetId);
          return (
            <div className="flex flex-col gap-4">
              <YearSelect years={rows} value={yearId} onChange={setChosenYear} />
              <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                <legend className="mb-2 font-medium">{t("academic.preset.choose")}</legend>
                {PRESETS.map((p) => (
                  <label key={p.id} className="block cursor-pointer">
                    <input
                      type="radio"
                      name="preset"
                      value={p.id}
                      checked={presetId === p.id}
                      onChange={() => {
                        setPresetId(p.id);
                        setResult(null);
                      }}
                      className="sr-only peer"
                    />
                    <span className="block rounded-lg peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                      <Card title={t(p.titleKey)} meta={[t(p.descriptionKey)]} />
                    </span>
                  </label>
                ))}
              </fieldset>
              {preset && preset.levels.length > 0 ? (
                <Button
                  loading={action.busy}
                  onClick={() =>
                    void action.run(async () => setResult(await repo.applyPreset(preset, yearId)))
                  }
                >
                  {t("academic.preset.apply")}
                </Button>
              ) : (
                <Link
                  to="/app/academic/levels"
                  className="inline-flex min-h-tap items-center text-primary underline"
                >
                  {t("academic.preset.blank.action")}
                </Link>
              )}
              <ErrorLine errorKey={action.error} />
              {result !== null ? (
                <p role="status" className="m-0 rounded-md border border-line-strong p-3">
                  {t("academic.preset.done", {
                    levels: formatNumber(result.levelsAdded),
                    sections: formatNumber(result.sectionsAdded),
                    subjects: formatNumber(result.subjectsAdded),
                    mappings: formatNumber(result.mappingsAdded),
                  })}
                </p>
              ) : null}
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
