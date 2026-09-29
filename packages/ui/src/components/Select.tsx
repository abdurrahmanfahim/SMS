import { useId, type ReactNode, type Ref, type SelectHTMLAttributes } from "react";

import { cn } from "./cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: SelectOption[];
  /** First, empty option (for example "Choose a class"). */
  placeholderOption?: string;
  helperText?: string;
  error?: string;
  errorPrefix?: string;
  /** Shown instead of the control when there are no options; must say why. */
  emptyText?: ReactNode;
  ref?: Ref<HTMLSelectElement>;
}

/** Native select: phones show their own picker, which is the most reliable touch pattern. */
export function Select({
  label,
  options,
  placeholderOption,
  helperText,
  error,
  errorPrefix,
  emptyText,
  id,
  className,
  ref,
  ...rest
}: SelectProps) {
  const auto = useId();
  const selectId = id ?? auto;
  const helpId = `${selectId}-help`;
  const errorId = `${selectId}-error`;
  const describedBy = [error ? errorId : null, helperText ? helpId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium">
        {label}
      </label>
      {options.length === 0 && emptyText ? (
        <p className="m-0 text-content-secondary">{emptyText}</p>
      ) : (
        <select
          {...rest}
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "min-h-tap w-full rounded-md border bg-surface px-3 text-base text-content disabled:opacity-60",
            error ? "border-danger border-2" : "border-line-strong",
            className,
          )}
        >
          {placeholderOption ? <option value="">{placeholderOption}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
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
