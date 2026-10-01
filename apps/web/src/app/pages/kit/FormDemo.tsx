import { useState } from "react";
import { z } from "zod";

import {
  DateField,
  Form,
  NumberField,
  PhoneField,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
  choiceField,
  dateField,
  numberField,
  optionalText,
  phoneField,
  requiredText,
  useAppForm,
} from "../../../shared/forms";
import { useT } from "../../../shared/i18n";

const schema = z.object({
  name: requiredText({ max: 60 }),
  marks: numberField({ min: 0, max: 100 }),
  phone: phoneField(),
  born: dateField({ max: "2026-12-31" }),
  section: choiceField(),
  note: optionalText({ max: 200 }),
});

export function FormDemo() {
  const t = useT();
  const [result, setResult] = useState<unknown>(null);
  const form = useAppForm(schema, {
    name: "",
    marks: "",
    phone: "",
    born: "",
    section: "",
    note: "",
  });
  return (
    <div className="flex flex-col gap-4">
      <Form
        form={form}
        label={t("devkit.kit.formSection")}
        onSubmit={(values) => setResult(values)}
      >
        <TextField name="name" label={t("devkit.kit.formName")} autoComplete="name" />
        <NumberField name="marks" label={t("devkit.kit.formMarks")} />
        <PhoneField name="phone" label={t("devkit.kit.formPhone")} />
        <DateField name="born" label={t("devkit.kit.formBorn")} max="2026-12-31" />
        <SelectField
          name="section"
          label={t("devkit.kit.formSectionField")}
          placeholderOption={t("devkit.kit.selectPlaceholder")}
          options={["ক", "খ", "গ"].map((s) => ({ value: s, label: s }))}
        />
        <TextareaField name="note" label={t("devkit.kit.formNote")} optional />
        <div>
          <SubmitButton>{t("common.action.save")}</SubmitButton>
        </div>
      </Form>
      {result ? (
        <div>
          <h3 className="m-0 mb-2 text-lg font-semibold">{t("devkit.kit.formResult")}</h3>
          <pre
            data-testid="form-result"
            className="m-0 overflow-x-auto rounded-md bg-surface-subtle p-3 text-sm"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
