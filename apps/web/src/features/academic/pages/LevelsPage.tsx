import { Button, ConfirmDialog, ReorderList } from "@sms/ui";
import { useState } from "react";
import { z } from "zod";

import {
  Form,
  SelectField,
  SubmitButton,
  TextField,
  optionalText,
  useAppForm,
} from "../../../shared/forms";
import { useT } from "../../../shared/i18n";
import { useAcademic } from "../context";
import type { AcademicErrorKey } from "../data/errors";
import type { LevelRow } from "../data/types";
import { useClassLevels } from "../hooks";
import {
  ErrorLine,
  FormSheet,
  Loadable,
  PageHeader,
  ReadOnlyNote,
  useAction,
  useDisplayName,
} from "../ui";

const CATEGORIES = ["school", "madrasa", "coaching", "other"] as const;
type Category = (typeof CATEGORIES)[number];

const schema = z.object({
  nameBn: optionalText({ max: 60 }),
  nameEn: optionalText({ max: 60 }),
  category: z.string(),
});

function LevelForm({
  initial,
  onSubmit,
  error,
}: {
  initial: LevelRow | null;
  onSubmit: (v: { nameBn: string; nameEn: string; category: Category | null }) => Promise<void>;
  error: AcademicErrorKey | null;
}) {
  const t = useT();
  const [local, setLocal] = useState<AcademicErrorKey | null>(null);
  const form = useAppForm(schema, {
    nameBn: initial?.name_bn ?? "",
    nameEn: initial?.name_en ?? "",
    category: initial?.category ?? "",
  });
  return (
    <Form
      form={form}
      label={t("academic.levels.formLabel")}
      onSubmit={async (v) => {
        if (v.nameBn === "" && v.nameEn === "") return setLocal("academic.error.nameRequired");
        setLocal(null);
        const category = CATEGORIES.find((c) => c === v.category) ?? null;
        await onSubmit({ nameBn: v.nameBn, nameEn: v.nameEn, category });
      }}
    >
      <TextField name="nameBn" label={t("academic.field.nameBn")} optional maxLength={60} />
      <TextField name="nameEn" label={t("academic.field.nameEn")} optional maxLength={60} />
      <SelectField
        name="category"
        label={t("academic.levels.categoryLabel")}
        optional
        placeholderOption={t("academic.levels.categoryNone")}
        options={CATEGORIES.map((c) => ({ value: c, label: t(`academic.levels.category.${c}`) }))}
      />
      <ErrorLine errorKey={local ?? error} />
      <SubmitButton>{t("common.action.save")}</SubmitButton>
    </Form>
  );
}

export function LevelsPage() {
  const t = useT();
  const name = useDisplayName();
  const { repo, canWrite } = useAcademic();
  const levels = useClassLevels();
  const [editing, setEditing] = useState<LevelRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<LevelRow | null>(null);
  const action = useAction(levels.reload);
  const close = () => {
    setEditing(null);
    action.clearError();
  };

  return (
    <div>
      <PageHeader titleKey="academic.levels.title" />
      {canWrite ? (
        <Button className="mb-4" onClick={() => setEditing("new")}>
          {t("academic.levels.add")}
        </Button>
      ) : (
        <ReadOnlyNote />
      )}
      <Loadable
        resource={levels}
        isEmpty={(d) => d.length === 0}
        emptyTitleKey="academic.levels.empty.title"
        emptyDescriptionKey="academic.levels.empty.description"
      >
        {(rows) =>
          canWrite ? (
            <ReorderList
              items={rows}
              getKey={(l) => l.id}
              moveUpLabel={(l) => t("academic.levels.moveUp", { name: name(l) })}
              moveDownLabel={(l) => t("academic.levels.moveDown", { name: name(l) })}
              onChange={(next) => void action.run(() => repo.reorderLevels(next.map((l) => l.id)))}
              renderItem={(l) => (
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{name(l)}</span>
                  <span className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(l)}>
                      {t("academic.action.edit")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(l)}>
                      {t("academic.action.delete")}
                    </Button>
                  </span>
                </div>
              )}
            />
          ) : (
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map((l) => (
                <li key={l.id} className="rounded-md border border-line-strong p-3">
                  {name(l)}
                </li>
              ))}
            </ol>
          )
        }
      </Loadable>
      {action.error !== null && editing === null ? <ErrorLine errorKey={action.error} /> : null}
      <FormSheet
        open={editing !== null}
        onClose={close}
        title={editing === "new" ? t("academic.levels.add") : t("academic.levels.edit")}
      >
        {editing !== null ? (
          <LevelForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            error={action.error}
            onSubmit={async (v) => {
              const input = { nameBn: v.nameBn, nameEn: v.nameEn, category: v.category };
              const done = await action.run(() =>
                editing === "new" ? repo.createLevel(input) : repo.updateLevel(editing.id, input),
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
        title={t("academic.levels.deleteTitle")}
        description={t("academic.levels.deleteBody", { name: deleting ? name(deleting) : "" })}
        confirmLabel={t("academic.action.delete")}
        cancelLabel={t("common.action.cancel")}
        destructive
        loading={action.busy}
        onConfirm={() => {
          const target = deleting;
          if (target === null) return;
          void action.run(() => repo.deleteLevel(target.id)).then(() => setDeleting(null));
        }}
      />
    </div>
  );
}
