import { Badge, Button, Card, Select } from "@sms/ui";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useT } from "../../../shared/i18n";
import { useAcademic } from "../context";
import { useAcademicYears, useClassLevels, useClassSubjects, useSubjects } from "../hooks";
import {
  ErrorLine,
  Loadable,
  PageHeader,
  ReadOnlyNote,
  YearSelect,
  defaultYearId,
  useAction,
  useDisplayName,
} from "../ui";

function MappingForYear({ yearId }: { yearId: string }) {
  const t = useT();
  const name = useDisplayName();
  const { repo, canWrite } = useAcademic();
  const levels = useClassLevels();
  const subjects = useSubjects();
  const mappings = useClassSubjects(yearId);
  const [levelChoice, setLevelChoice] = useState("");
  const [addChoice, setAddChoice] = useState("");
  const action = useAction(mappings.reload);

  return (
    <Loadable
      resource={levels}
      isEmpty={(d) => d.length === 0}
      emptyTitleKey="academic.classSubjects.noLevels.title"
      emptyDescriptionKey="academic.classSubjects.noLevels.description"
      emptyAction={
        <Link to="/app/academic/levels" className="text-primary underline">
          {t("academic.sections.noLevels.action")}
        </Link>
      }
    >
      {(levelRows) => (
        <Loadable
          resource={subjects}
          isEmpty={(d) => d.length === 0}
          emptyTitleKey="academic.classSubjects.noSubjects.title"
          emptyDescriptionKey="academic.classSubjects.noSubjects.description"
          emptyAction={
            <Link to="/app/academic/subjects" className="text-primary underline">
              {t("academic.classSubjects.noSubjects.action")}
            </Link>
          }
        >
          {(subjectRows) => (
            <Loadable resource={mappings} emptyTitleKey="academic.classSubjects.empty.title">
              {(mappingRows) => {
                const levelId = levelRows.some((l) => l.id === levelChoice)
                  ? levelChoice
                  : (levelRows[0]?.id ?? "");
                const mine = mappingRows.filter((m) => m.class_level_id === levelId);
                const mappedIds = new Set(mine.map((m) => m.subject_id));
                const free = subjectRows.filter((s) => !mappedIds.has(s.id));
                const byId = new Map(subjectRows.map((s) => [s.id, s]));
                return (
                  <div className="flex flex-col gap-4">
                    <Select
                      label={t("academic.field.level")}
                      value={levelId}
                      onChange={(e) => setLevelChoice(e.target.value)}
                      options={levelRows.map((l) => ({ value: l.id, label: name(l) }))}
                      errorPrefix={t("common.state.error")}
                    />
                    {mine.length === 0 ? (
                      <p className="m-0">{t("academic.classSubjects.none")}</p>
                    ) : (
                      <ul className="m-0 flex list-none flex-col gap-3 p-0">
                        {mine.map((m) => {
                          const subject = byId.get(m.subject_id);
                          return (
                            <li key={m.id}>
                              <Card
                                title={subject ? name(subject) : ""}
                                trailing={
                                  <Badge tone={m.is_optional ? "info" : "neutral"}>
                                    {m.is_optional
                                      ? t("academic.classSubjects.optional")
                                      : t("academic.classSubjects.required")}
                                  </Badge>
                                }
                              >
                                {canWrite ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                      variant="secondary"
                                      loading={action.busy}
                                      onClick={() =>
                                        void action.run(() =>
                                          repo.setClassSubjectOptional(m.id, !m.is_optional),
                                        )
                                      }
                                    >
                                      {m.is_optional
                                        ? t("academic.classSubjects.makeRequired")
                                        : t("academic.classSubjects.makeOptional")}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      loading={action.busy}
                                      onClick={() =>
                                        void action.run(() => repo.removeClassSubject(m.id))
                                      }
                                    >
                                      {t("academic.classSubjects.remove")}
                                    </Button>
                                  </div>
                                ) : null}
                              </Card>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {canWrite && free.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <Select
                          label={t("academic.classSubjects.addLabel")}
                          value={addChoice}
                          onChange={(e) => setAddChoice(e.target.value)}
                          placeholderOption={t("academic.classSubjects.choose")}
                          options={free.map((s) => ({ value: s.id, label: name(s) }))}
                          errorPrefix={t("common.state.error")}
                        />
                        <Button
                          disabled={addChoice === "" || !free.some((s) => s.id === addChoice)}
                          loading={action.busy}
                          onClick={() =>
                            void action
                              .run(() => repo.addClassSubject(yearId, levelId, addChoice))
                              .then((ok) => {
                                if (ok) setAddChoice("");
                              })
                          }
                        >
                          {t("academic.classSubjects.add")}
                        </Button>
                      </div>
                    ) : null}
                    <ErrorLine errorKey={action.error} />
                  </div>
                );
              }}
            </Loadable>
          )}
        </Loadable>
      )}
    </Loadable>
  );
}

export function ClassSubjectsPage() {
  const { canWrite } = useAcademic();
  const years = useAcademicYears();
  const [chosen, setChosen] = useState("");
  return (
    <div>
      <PageHeader titleKey="academic.classSubjects.title" />
      {canWrite ? null : <ReadOnlyNote />}
      <Loadable
        resource={years}
        isEmpty={(d) => d.length === 0}
        emptyTitleKey="academic.sections.noYears.title"
        emptyDescriptionKey="academic.sections.noYears.description"
      >
        {(rows) => {
          const yearId = rows.some((y) => y.id === chosen) ? chosen : defaultYearId(rows);
          return (
            <div className="flex flex-col gap-4">
              <YearSelect years={rows} value={yearId} onChange={setChosen} />
              <MappingForYear key={yearId} yearId={yearId} />
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
