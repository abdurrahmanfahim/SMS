import { useId, type InputHTMLAttributes, type Ref } from "react";

import { cn } from "./cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label. Required: a placeholder is never the only label. */
  label: string;
  helperText?: string;
  /** Error text. Shown with an icon-like prefix mark and linked through aria-describedby. */
  error?: string;
  /** Text spoken before the error, e.g. "Error". Keeps the error from being colour-only. */
  errorPrefix?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Labelled text input, one 44px size; width comes from the container. */
export function Input({
  label,
  helperText,
  error,
  errorPrefix,
  id,
  className,
  ref,
  ...rest
}: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, helperText ? helpId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        {...rest}
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "min-h-tap w-full rounded-md border bg-surface px-3 text-base text-content disabled:opacity-60",
          error ? "border-danger border-2" : "border-line-strong",
          className,
        )}
      />
      {helperText ? (
        <p id={helpId} className="m-0 text-sm text-content-secondary">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="m-0 text-sm font-medium text-danger">
          <span aria-hidden="true">⚠ </span>
          {errorPrefix ? <span className="sr-only">{errorPrefix}: </span> : null}
          {error}
        </p>
      ) : null}
    </div>
  );
}
