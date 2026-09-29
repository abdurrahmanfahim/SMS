/**
 * @sms/ui: design-system components. Colours, type, spacing and motion come from CSS variables
 * generated from docs/spec/design-tokens.json (import "@sms/ui/tokens.css").
 * Components never contain user-visible text of their own: callers pass translated strings.
 */
export { Badge, type BadgeTone } from "./components/Badge";
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from "./components/Button";
export { Card, type CardProps } from "./components/Card";
export { cn } from "./components/cn";
export { ConfirmDialog, type ConfirmDialogProps } from "./components/ConfirmDialog";
export { Dialog, type DialogProps } from "./components/Dialog";
export { EmptyState } from "./components/EmptyState";
export { ErrorState } from "./components/ErrorState";
export { Input, type InputProps } from "./components/Input";
export { ReorderList, type ReorderListProps } from "./components/ReorderList";
export { Select, type SelectOption, type SelectProps } from "./components/Select";
export { Sheet, type SheetProps } from "./components/Sheet";
export { StickyActionBar } from "./components/StickyActionBar";
export { Skeleton } from "./components/Skeleton";
export { Spinner } from "./components/Spinner";
export { ToastProvider, useToast, type ToastInput, type ToastTone } from "./components/Toast";

/** Kept from the M0-P1 placeholder; the package smoke test still uses it. */
export function ping(): "pong" {
  return "pong";
}
