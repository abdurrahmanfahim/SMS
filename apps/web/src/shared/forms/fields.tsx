import { Input, Select, type SelectOption } from "@sms/ui";
import { type ReactNode, useId } from "react";
import { useController, useFormContext } from "react-hook-form";

import { useT } from "../i18n";

import { asciiWhileTyping, cleanNumericText } from "./digits";
import { translateFormError } from "./messages";

interface BaseFieldProps {
  /** Field name in the form values (dotted for nested values). */
  name: string;
  /** Visible label (translated). A placeholder is never the only label. */
  label: string;
  helperText?: string;
  /** Adds the translated "(optional)" mark to the label. */
  optional?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}

function useFormField(name: string) {
  const { control } = useFormContext();
  const t = useT();
  const { field, fieldState } = useController({ name, control });
  return {
    field,
    error: translateFormError(fieldState.error?.message),
    errorPrefix: t("common.state.error"),
    withOptional: (label: string, optional?: boolean) =>
      optional ? `${label} ${t("forms.field.optional")}` : label,
  };
}

/** Single-line text. */
export function TextField(
  props: BaseFieldProps & { maxLength?: number; inputMode?: "text" | "email" | "url" },
) {
  const { name, label, helperText, optional, disabled, autoComplete, maxLength, inputMode } = props;
  const { field, error, errorPrefix, withOptional } = useFormField(name);
  return (
    <Input
      ref={field.ref}
      name={field.name}
      label={withOptional(label, optional)}
      helperText={helperText}
      error={error}
      errorPrefix={errorPrefix}
      value={field.value ?? ""}
      onChange={(e) => field.onChange(e.target.value)}
      onBlur={field.onBlur}
      disabled={disabled}
      autoComplete={autoComplete}
      maxLength={maxLength}
      inputMode={inputMode}
    />
  );
}

/**
 * Number typed on the phone keypad. Bangla digits are turned into ASCII as they are typed, and
 * spaces and grouping commas are removed when the field is left. Pair with `numberField` or
 * `optionalNumberField` from `./schema`.
 */
export function NumberField(props: BaseFieldProps & { integer?: boolean }) {
  const { name, label, helperText, optional, disabled, autoComplete, integer } = props;
  const { field, error, errorPrefix, withOptional } = useFormField(name);
  return (
    <Input
      ref={field.ref}
      name={field.name}
      label={withOptional(label, optional)}
      helperText={helperText}
      error={error}
      errorPrefix={errorPrefix}
      value={field.value ?? ""}
      inputMode={integer ? "numeric" : "decimal"}
      onChange={(e) => field.onChange(asciiWhileTyping(e.target.value))}
      onBlur={() => {
        field.onChange(cleanNumericText(field.value ?? ""));
        field.onBlur();
      }}
      disabled={disabled}
      autoComplete={autoComplete}
    />
  );
}

/** Bangladeshi mobile number. Bangla digits, spaces and dashes are accepted. Pair with `phoneField`. */
export function PhoneField(props: BaseFieldProps) {
  const { name, label, helperText, optional, disabled } = props;
  const { field, error, errorPrefix, withOptional } = useFormField(name);
  return (
    <Input
      ref={field.ref}
      name={field.name}
      type="tel"
      inputMode="tel"
      autoComplete={props.autoComplete ?? "tel"}
      label={withOptional(label, optional)}
      helperText={helperText}
      error={error}
      errorPrefix={errorPrefix}
      value={field.value ?? ""}
      onChange={(e) => field.onChange(asciiWhileTyping(e.target.value))}
      onBlur={field.onBlur}
      disabled={disabled}
    />
  );
}

/** Calendar date using the phone's own date picker. The value is always ISO `YYYY-MM-DD`. Pair with `dateField`. */
export function DateField(props: BaseFieldProps & { min?: string; max?: string }) {
  const { name, label, helperText, optional, disabled, min, max } = props;
  const { field, error, errorPrefix, withOptional } = useFormField(name);
  return (
    <Input
      ref={field.ref}
      name={field.name}
      type="date"
      label={withOptional(label, optional)}
      helperText={helperText}
      error={error}
      errorPrefix={errorPrefix}
      value={field.value ?? ""}
      onChange={(e) => field.onChange(e.target.value)}
      onBlur={field.onBlur}
      disabled={disabled}
      min={min}
      max={max}
    />
  );
}

/** Choice from a list, with the phone's native picker. */
export function SelectField(
  props: BaseFieldProps & {
    options: SelectOption[];
    placeholderOption?: string;
    emptyText?: ReactNode;
  },
) {
  const { name, label, helperText, optional, disabled, options, placeholderOption, emptyText } =
    props;
  const { field, error, errorPrefix, withOptional } = useFormField(name);
  return (
    <Select
      ref={field.ref}
      name={field.name}
      label={withOptional(label, optional)}
      helperText={helperText}
      error={error}
      errorPrefix={errorPrefix}
      options={options}
      placeholderOption={placeholderOption}
      emptyText={emptyText}
      value={field.value ?? ""}
      onChange={(e) => field.onChange(e.target.value)}
      onBlur={field.onBlur}
      disabled={disabled}
    />
  );
}

/** Multi-line text (address, remarks). */
export function TextareaField(props: BaseFieldProps & { rows?: number; maxLength?: number }) {
  const { name, label, helperText, optional, disabled, rows = 3, maxLength } = props;
  const { field, error, errorPrefix, withOptional } = useFormField(name);
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, helperText ? `${id}-help` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {withOptional(label, optional)}
      </label>
      <textarea
        ref={field.ref}
        id={id}
        name={field.name}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        value={field.value ?? ""}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`w-full rounded-md border bg-surface px-3 py-2 text-base text-content disabled:opacity-60 ${
          error ? "border-2 border-danger" : "border-line-strong"
        }`}
      />
      {helperText ? (
        <p id={`${id}-help`} className="m-0 text-sm text-content-secondary">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="m-0 text-sm font-medium text-danger">
          <span aria-hidden="true">⚠ </span>
          <span className="sr-only">{errorPrefix}: </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
