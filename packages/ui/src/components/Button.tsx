import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "./cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  /** sm 36px (inline), md 44px (default, meets the touch target), lg 52px (final wizard step). */
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  /** Shows a spinner next to the label and sets aria-busy. The label stays in the accessible name. */
  loading?: boolean;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "border border-line-strong bg-surface text-content hover:bg-surface-subtle",
  destructive: "bg-danger text-danger-fg",
  ghost: "bg-transparent text-content hover:bg-surface-subtle",
};
const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3 text-sm",
  md: "min-h-tap px-4 text-base",
  lg: "min-h-[52px] px-6 text-lg",
};

/** Native button. Disabled and loading states use aria-disabled and block clicks. */
export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  loading = false,
  disabled = false,
  type = "button",
  className,
  children,
  onClick,
  ref,
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-base",
        VARIANT[variant],
        SIZE[size],
        inactive && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {loading ? <Spinner /> : leadingIcon}
      {children}
    </button>
  );
}
