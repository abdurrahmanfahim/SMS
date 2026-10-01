import { Button, type ButtonProps } from "@sms/ui";
import { type ReactNode, useState } from "react";
import {
  type FieldValues,
  FormProvider,
  type UseFormReturn,
  useFormContext,
} from "react-hook-form";

import { formatNumber } from "../format";
import { useT } from "../i18n";

export interface FormProps<TIn extends FieldValues, TOut> {
  form: UseFormReturn<TIn, unknown, TOut>;
  /** Called with the parsed values. Throwing or rejecting shows the "could not save" message and keeps every typed value. */
  onSubmit: (values: TOut) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  /** Accessible name of the form. */
  label?: string;
}

/**
 * Wraps `<form noValidate>` around react-hook-form: submit handling, a spoken summary when fields
 * are wrong, and a translated "could not save" message that leaves the person's input in place.
 */
export function Form<TIn extends FieldValues, TOut>({
  form,
  onSubmit,
  children,
  className,
  label,
}: FormProps<TIn, TOut>) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const errorCount = Object.keys(form.formState.errors).length;
  const submit = form.handleSubmit(async (values) => {
    setFailed(false);
    try {
      await onSubmit(values);
    } catch {
      setFailed(true);
    }
  });

  return (
    <FormProvider {...(form as unknown as UseFormReturn<FieldValues, unknown, FieldValues>)}>
      <form
        noValidate
        aria-label={label}
        className={className ?? "flex max-w-xl flex-col gap-4"}
        onSubmit={(event) => void submit(event)}
      >
        {form.formState.submitCount > 0 && errorCount > 0 ? (
          <p role="alert" data-testid="form-error-summary" className="m-0 font-medium text-danger">
            {t("forms.summary.errors", { count: formatNumber(errorCount) })}
          </p>
        ) : null}
        {failed ? (
          <p role="alert" data-testid="form-save-failed" className="m-0 font-medium text-danger">
            {t("forms.error.saveFailed")}
          </p>
        ) : null}
        {children}
      </form>
    </FormProvider>
  );
}

/** Submit button that shows the saving state and blocks a second submit while one is running. */
export function SubmitButton(props: Omit<ButtonProps, "type" | "loading">) {
  const { formState } = useFormContext();
  return <Button {...props} type="submit" loading={formState.isSubmitting} />;
}
