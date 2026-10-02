import { Button, Card, ConfirmDialog } from "@sms/ui";
import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";

import {
  Form,
  NumberField,
  SubmitButton,
  TextField,
  optionalNumberField,
  optionalText,
  requiredText,
  useAppForm,
} from "../../../shared/forms";
import { formatNumber } from "../../../shared/format";
import { useT } from "../../../shared/i18n";
import { useAcademic } from "../context";
import type { AcademicErrorKey } from "../data/errors";
import type { LevelRow, SectionRow } from "../data/types";
import { useAcademicYears, useClassLevels, useSections } from "../hooks";
import { hasDuplicateName } from "../rules";
import {
  ErrorLine,
  FormSheet,
  Loadable,
  PageHeader,
  ReadOnlyNote,
  YearSelect,
  defaultYearId,
  useAction,
  useDisplayName,
} from "../ui";

const schema = z.object({
  name: requiredText({ max: 20 }),
  shift: optionalText({ max: 30 }),
  capacity: optionalNumberField({ min: 1, max: 500, integer: true }),
});

type Target = { level: LevelRow; section: SectionRow | null };

function SectionForm({
  initial,
  siblings,
  onSubmit,
  error,
}: {
  initial: SectionRow | null;
  siblings: SectionRow[];
  onSubmit: (v: z.output<typeof schema>) => Promise<void>;
  error: AcademicErrorKey | null;
}) {
  const t = useT();
  const [local, setLocal] = useState<AcademicErrorKey | null>(null);
  const form = useAppForm(schema, {
    name: initial?.name ?? "",
    shift: initial?.shift ?? "",
    capacity: initial?.capacity === null || initial === null ? "" : String(initial.capacity),
  });
  return (
    <Form
      form={form}
      label={t("academic.sections.formLabel")}
      onSubmit={async (v) => {
        const others = siblings.filter((s) => s.id !== initial?.id).map((s) => s.name);
        if (hasDuplicateName(v.name, others)) return setLocal("academic.error.duplicateSection");
        setLocal(null);
        await onSubmit(v);
      }}
    >
      <TextField name="name" label={t("academic.sections.name")} maxLength={20} />
      <TextField name="shift" label={t("academic.sections.shift")} optional maxLength={30} />
      <NumberField name="capacity" label={t("academic.sections.capacity")} optional integer />
      <ErrorLine errorKey={local ?? error} />
      <SubmitButton>{t("common.action.save")}</SubmitButton>
    </Form>
  );
}

function SectionsForYear({ yearId }: { yearId: string }) {
  const t = useT();
  const name = useDisplayName();
  const { repo, canWrite } = useAcademic();
  const levels = useClassLevels();
  const sections = useSections(yearId);
  const [editing, setEditing] = useState<Target | null>(null);
  const [deleting, setDeleting] = useState<SectionRow | null>(null);
  const action = useAction(sections.reload);
  const close = () => {
    setEditing(null);
    action.clearError();
  };

  return (
    <>
      <Loadable
        resource={levels}
        isEmpty={(d) => d.length === 0}
        emptyTitleKey="academic.sections.noLevels.title"
        emptyDescriptionKey="academic.sections.noLevels.description"
        emptyAction={
          canWrite ? (
            <Link to="/app/academic/levels" className="text-primary underline">
              {t("academic.sections.noLevels.action")}
            </Link>
          ) : undefined
        }
      >
        {(levelRows) => (
          <Loadable resource={sections} emptyTitleKey="academic.sections.empty.title">
            {(sectionRows) => (
              <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {levelRows.map((level) => {
                  const own = sectionRows.filter((s) => s.class_level_id === level.id);
                  return (
                    <li key={level.id}>
                      <Card title={name(level)}>
                        {own.length === 0 ? (
                          <p className="m-0 mt-2">{t("academic.sections.none")}</p>
                        ) : (
                          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                            {own.map((s) => (
                              <li
                                key={s.id}
                                className="flex flex-wrap items-center justify-between gap-2"
                              >
                                <span>
                                  {s.name}
                                  {s.capacity !== null
                                    ? ` · ${t("academic.sections.capacityValue", { count: formatNumber(s.capacity) })}`
                                    : ""}
                                  {s.shift ? ` · ${s.shift}` : ""}
                                </span>
                                {canWrite ? (
                                  <span className="flex gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => setEditing({ level, section: s })}
                                    >
                                      {t("academic.action.edit")}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleting(s)}
                                    >
                                      {t("academic.action.delete")}
                                    </Button>
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                        {canWrite ? (
                          <Button
                            className="mt-3"
                            variant="secondary"
                            onClick={() => setEditing({ level, section: null })}
                          >
                            {t("academic.sections.add", { level: name(level) })}
                          </Button>
                        ) : null}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </Loadable>
        )}
      </Loadable>
      {action.error !== null && editing === null ? <ErrorLine errorKey={action.error} /> : null}
      <FormSheet
        open={editing !== null}
        onClose={close}
        title={
          editing?.section
            ? t("academic.sections.edit")
            : t("academic.sections.add", { level: editing ? name(editing.level) : "" })
        }
      >
        {editing !== null ? (
          <SectionForm
            key={editing.section?.id ?? `new-${editing.level.id}`}
            initial={editing.section}
            siblings={(sections.data ?? []).filter((s) => s.class_level_id === editing.level.id)}
            error={action.error}
            onSubmit={async (v) => {
              const input = {
                academicYearId: yearId,
                classLevelId: editing.level.id,
                name: v.name,
                shift: v.shift,
                capacity: v.capacity ?? null,
              };
              const done = await action.run(() =>
                editing.section
                  ? repo.updateSection(editing.section.id, input)
                  : repo.createSection(input),
              );
              if (done) setEditing(null);
            }}
          />
        ) : null}
      </FormSheet>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("academic.sections.deleteTitle")}
        description={t("academic.sections.deleteBody", { name: deleting?.name ?? "" })}
        confirmLabel={t("academic.action.delete")}
        cancelLabel={t("common.action.cancel")}
        destructive
        loading={action.busy}
        onConfirm={() => {
          const target = deleting;
          if (target === null) return;
          void action.run(() => repo.deleteSection(target.id)).then(() => setDeleting(null));
        }}
      />
    </>
  );
}

export function SectionsPage() {
  const { canWrite } = useAcademic();
  const years = useAcademicYears();
  const [chosen, setChosen] = useState("");
  return (
    <div>
      <PageHeader titleKey="academic.sections.title" />
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
              <SectionsForYear key={yearId} yearId={yearId} />
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
