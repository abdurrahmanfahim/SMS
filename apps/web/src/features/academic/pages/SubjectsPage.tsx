import { Button, Card, ConfirmDialog } from "@sms/ui";
import { useState } from "react";
import { z } from "zod";

import { Form, SubmitButton, TextField, optionalText, useAppForm } from "../../../shared/forms";
import { useT } from "../../../shared/i18n";
import { useAcademic } from "../context";
import type { AcademicErrorKey } from "../data/errors";
import type { SubjectRow } from "../data/types";
import { useSubjects } from "../hooks";
import {
  ErrorLine,
  FormSheet,
  Loadable,
  PageHeader,
  ReadOnlyNote,
  useAction,
  useDisplayName,
} from "../ui";

const schema = z.object({
  nameBn: optionalText({ max: 80 }),
  nameEn: optionalText({ max: 80 }),
  code: optionalText({ max: 20 }),
});

function SubjectForm({
  initial,
  onSubmit,
  error,
}: {
  initial: SubjectRow | null;
  onSubmit: (v: z.output<typeof schema>) => Promise<void>;
  error: AcademicErrorKey | null;
}) {
  const t = useT();
  const [local, setLocal] = useState<AcademicErrorKey | null>(null);
  const form = useAppForm(schema, {
    nameBn: initial?.name_bn ?? "",
    nameEn: initial?.name_en ?? "",
    code: initial?.code ?? "",
  });
  return (
    <Form
      form={form}
      label={t("academic.subjects.formLabel")}
      onSubmit={async (v) => {
        if (v.nameBn === "" && v.nameEn === "") return setLocal("academic.error.nameRequired");
        setLocal(null);
        await onSubmit(v);
      }}
    >
      <TextField name="nameBn" label={t("academic.field.nameBn")} optional maxLength={80} />
      <TextField name="nameEn" label={t("academic.field.nameEn")} optional maxLength={80} />
      <TextField name="code" label={t("academic.subjects.code")} optional maxLength={20} />
      <ErrorLine errorKey={local ?? error} />
      <SubmitButton>{t("common.action.save")}</SubmitButton>
    </Form>
  );
}

export function SubjectsPage() {
  const t = useT();
  const name = useDisplayName();
  const { repo, canWrite } = useAcademic();
  const subjects = useSubjects();
  const [editing, setEditing] = useState<SubjectRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<SubjectRow | null>(null);
  const action = useAction(subjects.reload);
  const close = () => {
    setEditing(null);
    action.clearError();
  };

  return (
    <div>
      <PageHeader titleKey="academic.subjects.title" />
      {canWrite ? (
        <Button className="mb-4" onClick={() => setEditing("new")}>
          {t("academic.subjects.add")}
        </Button>
      ) : (
        <ReadOnlyNote />
      )}
      <Loadable
        resource={subjects}
        isEmpty={(d) => d.length === 0}
        emptyTitleKey="academic.subjects.empty.title"
        emptyDescriptionKey="academic.subjects.empty.description"
      >
        {(rows) => (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rows.map((s) => (
              <li key={s.id}>
                <Card title={name(s)} meta={s.code ? [s.code] : []}>
                  {canWrite ? (
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" onClick={() => setEditing(s)}>
                        {t("academic.action.edit")}
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(s)}>
                        {t("academic.action.delete")}
                      </Button>
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Loadable>
      {action.error !== null && editing === null ? <ErrorLine errorKey={action.error} /> : null}
      <FormSheet
        open={editing !== null}
        onClose={close}
        title={editing === "new" ? t("academic.subjects.add") : t("academic.subjects.edit")}
      >
        {editing !== null ? (
          <SubjectForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            error={action.error}
            onSubmit={async (v) => {
              const done = await action.run(() =>
                editing === "new" ? repo.createSubject(v) : repo.updateSubject(editing.id, v),
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
        title={t("academic.subjects.deleteTitle")}
        description={t("academic.subjects.deleteBody", { name: deleting ? name(deleting) : "" })}
        confirmLabel={t("academic.action.delete")}
        cancelLabel={t("common.action.cancel")}
        destructive
        loading={action.busy}
        onConfirm={() => {
          const target = deleting;
          if (target === null) return;
          void action.run(() => repo.deleteSubject(target.id)).then(() => setDeleting(null));
        }}
      />
    </div>
  );
}
