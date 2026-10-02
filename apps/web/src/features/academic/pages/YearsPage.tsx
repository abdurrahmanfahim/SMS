import { Badge, Button, Card, ConfirmDialog } from "@sms/ui";
import { useState } from "react";
import { z } from "zod";

import {
  DateField,
  Form,
  SubmitButton,
  TextField,
  dateField,
  optionalText,
  useAppForm,
} from "../../../shared/forms";
import { useT } from "../../../shared/i18n";
import { useAcademic } from "../context";
import type { AcademicErrorKey } from "../data/errors";
import type { YearRow } from "../data/types";
import { useAcademicYears } from "../hooks";
import { checkYear } from "../rules";
import {
  ErrorLine,
  FormSheet,
  Loadable,
  PageHeader,
  ReadOnlyNote,
  useAction,
  useDisplayName,
  yearDates,
} from "../ui";

const schema = z.object({
  nameBn: optionalText({ max: 60 }),
  nameEn: optionalText({ max: 60 }),
  startsOn: dateField(),
  endsOn: dateField(),
});

function YearForm({
  initial,
  others,
  onSubmit,
  error,
}: {
  initial: YearRow | null;
  others: YearRow[];
  onSubmit: (v: z.output<typeof schema>) => Promise<void>;
  error: AcademicErrorKey | null;
}) {
  const t = useT();
  const [local, setLocal] = useState<AcademicErrorKey | null>(null);
  const form = useAppForm(schema, {
    nameBn: initial?.name_bn ?? "",
    nameEn: initial?.name_en ?? "",
    startsOn: initial?.starts_on ?? "",
    endsOn: initial?.ends_on ?? "",
  });
  return (
    <Form
      form={form}
      label={t("academic.years.formLabel")}
      onSubmit={async (v) => {
        if (v.nameBn === "" && v.nameEn === "") return setLocal("academic.error.nameRequired");
        const check = checkYear(
          { id: initial?.id, startsOn: v.startsOn, endsOn: v.endsOn },
          others.map((y) => ({ id: y.id, startsOn: y.starts_on, endsOn: y.ends_on })),
        );
        if (!check.ok) {
          return setLocal(
            check.reason === "overlap" ? "academic.error.overlap" : "academic.error.invalidDates",
          );
        }
        setLocal(null);
        await onSubmit(v);
      }}
    >
      <TextField name="nameBn" label={t("academic.field.nameBn")} optional maxLength={60} />
      <TextField name="nameEn" label={t("academic.field.nameEn")} optional maxLength={60} />
      <DateField name="startsOn" label={t("academic.years.startsOn")} />
      <DateField name="endsOn" label={t("academic.years.endsOn")} />
      <ErrorLine errorKey={local ?? error} />
      <SubmitButton>{t("common.action.save")}</SubmitButton>
    </Form>
  );
}

export function YearsPage() {
  const t = useT();
  const name = useDisplayName();
  const { repo, canWrite } = useAcademic();
  const years = useAcademicYears();
  const [editing, setEditing] = useState<YearRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<YearRow | null>(null);
  const action = useAction(years.reload);
  const close = () => {
    setEditing(null);
    action.clearError();
  };

  return (
    <div>
      <PageHeader titleKey="academic.years.title" />
      {canWrite ? (
        <Button className="mb-4" onClick={() => setEditing("new")}>
          {t("academic.years.add")}
        </Button>
      ) : (
        <ReadOnlyNote />
      )}
      <Loadable
        resource={years}
        isEmpty={(d) => d.length === 0}
        emptyTitleKey="academic.years.empty.title"
        emptyDescriptionKey="academic.years.empty.description"
      >
        {(rows) => (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rows.map((y) => (
              <li key={y.id}>
                <Card
                  title={name(y)}
                  meta={[yearDates(y)]}
                  trailing={
                    y.is_current ? (
                      <Badge tone="success">{t("academic.years.current")}</Badge>
                    ) : null
                  }
                >
                  {canWrite ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {y.is_current ? null : (
                        <Button
                          variant="secondary"
                          loading={action.busy}
                          onClick={() => void action.run(() => repo.setCurrentYear(y.id))}
                        >
                          {t("academic.years.makeCurrent")}
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => setEditing(y)}>
                        {t("academic.action.edit")}
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(y)}>
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
      {years.status !== "loading" && action.error !== null && editing === null ? (
        <ErrorLine errorKey={action.error} />
      ) : null}
      <FormSheet
        open={editing !== null}
        onClose={close}
        title={editing === "new" ? t("academic.years.add") : t("academic.years.edit")}
      >
        {editing !== null ? (
          <YearForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            others={years.data ?? []}
            error={action.error}
            onSubmit={async (v) => {
              const done = await action.run(() =>
                editing === "new" ? repo.createYear(v) : repo.updateYear(editing.id, v),
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
        title={t("academic.years.deleteTitle")}
        description={t("academic.years.deleteBody", { name: deleting ? name(deleting) : "" })}
        confirmLabel={t("academic.action.delete")}
        cancelLabel={t("common.action.cancel")}
        destructive
        loading={action.busy}
        onConfirm={() => {
          const target = deleting;
          if (target === null) return;
          void action.run(() => repo.deleteYear(target.id)).then(() => setDeleting(null));
        }}
      />
    </div>
  );
}
