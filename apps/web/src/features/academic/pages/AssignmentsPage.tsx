import { Button, Card } from "@sms/ui";
import { useState } from "react";
import { z } from "zod";

import { Form, SelectField, SubmitButton, choiceField, useAppForm } from "../../../shared/forms";
import { useT } from "../../../shared/i18n";
import { useAcademic } from "../context";
import type { AcademicErrorKey } from "../data/errors";
import type { AssignmentRow, LevelRow, SectionRow, SubjectRow, TeacherOption } from "../data/types";
import {
  useAcademicYears,
  useClassLevels,
  useSections,
  useSubjects,
  useTeacherAssignments,
  useTeachers,
} from "../hooks";
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
  sectionId: choiceField(),
  teacherId: choiceField(),
  subjectId: z.string(),
});

interface Lookups {
  levels: LevelRow[];
  sections: SectionRow[];
  subjects: SubjectRow[];
  teachers: TeacherOption[];
}

function AssignmentForm({
  lookups,
  onSubmit,
  error,
}: {
  lookups: Lookups;
  onSubmit: (v: {
    sectionId: string;
    membershipId: string;
    subjectId: string | null;
  }) => Promise<void>;
  error: AcademicErrorKey | null;
}) {
  const t = useT();
  const name = useDisplayName();
  const form = useAppForm(schema, { sectionId: "", teacherId: "", subjectId: "" });
  const levelName = new Map(lookups.levels.map((l) => [l.id, name(l)]));
  return (
    <Form
      form={form}
      label={t("academic.assignments.formLabel")}
      onSubmit={async (v) => {
        await onSubmit({
          sectionId: v.sectionId,
          membershipId: v.teacherId,
          subjectId: v.subjectId === "" ? null : v.subjectId,
        });
      }}
    >
      <SelectField
        name="sectionId"
        label={t("academic.field.section")}
        placeholderOption={t("academic.assignments.chooseSection")}
        options={lookups.sections.map((s) => ({
          value: s.id,
          label: `${levelName.get(s.class_level_id) ?? ""} – ${s.name}`,
        }))}
      />
      <SelectField
        name="teacherId"
        label={t("academic.assignments.teacher")}
        placeholderOption={t("academic.assignments.chooseTeacher")}
        options={lookups.teachers.map((x) => ({ value: x.membershipId, label: x.name }))}
      />
      <SelectField
        name="subjectId"
        label={t("academic.field.subject")}
        placeholderOption={t("academic.assignments.classTeacherOption")}
        options={lookups.subjects.map((s) => ({ value: s.id, label: name(s) }))}
      />
      <ErrorLine errorKey={error} />
      <SubmitButton>{t("common.action.save")}</SubmitButton>
    </Form>
  );
}

function AssignmentsForYear({ yearId }: { yearId: string }) {
  const t = useT();
  const name = useDisplayName();
  const { repo, canWrite } = useAcademic();
  const levels = useClassLevels();
  const sections = useSections(yearId);
  const subjects = useSubjects();
  const teachers = useTeachers();
  const assignments = useTeacherAssignments(yearId);
  const [adding, setAdding] = useState(false);
  const action = useAction(assignments.reload);
  const close = () => {
    setAdding(false);
    action.clearError();
  };

  return (
    <Loadable resource={levels} emptyTitleKey="academic.assignments.empty.title">
      {(levelRows) => (
        <Loadable
          resource={sections}
          isEmpty={(d) => d.length === 0}
          emptyTitleKey="academic.assignments.noSections.title"
          emptyDescriptionKey="academic.assignments.noSections.description"
        >
          {(sectionRows) => (
            <Loadable resource={subjects} emptyTitleKey="academic.assignments.empty.title">
              {(subjectRows) => (
                <Loadable resource={teachers} emptyTitleKey="academic.assignments.empty.title">
                  {(teacherRows) => (
                    <Loadable
                      resource={assignments}
                      emptyTitleKey="academic.assignments.empty.title"
                    >
                      {(rows: AssignmentRow[]) => {
                        const levelName = new Map(levelRows.map((l) => [l.id, name(l)]));
                        const subjectName = new Map(subjectRows.map((s) => [s.id, name(s)]));
                        const teacherName = new Map(
                          teacherRows.map((x) => [x.membershipId, x.name]),
                        );
                        return (
                          <div className="flex flex-col gap-4">
                            {canWrite ? (
                              teacherRows.length === 0 ? (
                                <p
                                  role="note"
                                  className="m-0 rounded-md border border-line-strong p-3"
                                >
                                  {t("academic.assignments.noTeachers")}
                                </p>
                              ) : (
                                <Button onClick={() => setAdding(true)}>
                                  {t("academic.assignments.add")}
                                </Button>
                              )
                            ) : null}
                            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                              {sectionRows.map((s) => {
                                const own = rows.filter((a) => a.section_id === s.id);
                                return (
                                  <li key={s.id}>
                                    <Card
                                      title={`${levelName.get(s.class_level_id) ?? ""} – ${s.name}`}
                                    >
                                      {own.length === 0 ? (
                                        <p className="m-0 mt-2">{t("academic.assignments.none")}</p>
                                      ) : (
                                        <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                                          {own.map((a) => (
                                            <li
                                              key={a.id}
                                              className="flex flex-wrap items-center justify-between gap-2"
                                            >
                                              <span>
                                                {teacherName.get(a.membership_id) ??
                                                  t("academic.assignments.unknownTeacher")}
                                                {" · "}
                                                {a.subject_id === null
                                                  ? t("academic.assignments.classTeacher")
                                                  : (subjectName.get(a.subject_id) ?? "")}
                                              </span>
                                              {canWrite ? (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  loading={action.busy}
                                                  onClick={() =>
                                                    void action.run(() =>
                                                      repo.deleteAssignment(a.id),
                                                    )
                                                  }
                                                >
                                                  {t("academic.action.delete")}
                                                </Button>
                                              ) : null}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </Card>
                                  </li>
                                );
                              })}
                            </ul>
                            {action.error !== null && !adding ? (
                              <ErrorLine errorKey={action.error} />
                            ) : null}
                            <FormSheet
                              open={adding}
                              onClose={close}
                              title={t("academic.assignments.add")}
                            >
                              {adding ? (
                                <AssignmentForm
                                  lookups={{
                                    levels: levelRows,
                                    sections: sectionRows,
                                    subjects: subjectRows,
                                    teachers: teacherRows,
                                  }}
                                  error={action.error}
                                  onSubmit={async (v) => {
                                    const done = await action.run(() =>
                                      repo.createAssignment({ academicYearId: yearId, ...v }),
                                    );
                                    if (done) setAdding(false);
                                  }}
                                />
                              ) : null}
                            </FormSheet>
                          </div>
                        );
                      }}
                    </Loadable>
                  )}
                </Loadable>
              )}
            </Loadable>
          )}
        </Loadable>
      )}
    </Loadable>
  );
}

export function AssignmentsPage() {
  const { canWrite } = useAcademic();
  const years = useAcademicYears();
  const [chosen, setChosen] = useState("");
  return (
    <div>
      <PageHeader titleKey="academic.assignments.title" />
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
              <AssignmentsForYear key={yearId} yearId={yearId} />
            </div>
          );
        }}
      </Loadable>
    </div>
  );
}
