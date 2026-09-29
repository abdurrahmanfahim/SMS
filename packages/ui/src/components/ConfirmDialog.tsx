import * as AlertDialog from "@radix-ui/react-alert-dialog";

import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Must name the real consequence, with counts where they exist. */
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  /** Action in progress: both buttons are inactive to prevent double submit. */
  loading?: boolean;
}

/**
 * alertdialog. Focus starts on Cancel so a destructive action is never confirmed by an accidental
 * Enter; Escape counts as Cancel; focus returns to the trigger on close.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-modal bg-black/50" />
        <AlertDialog.Content className="fixed inset-x-0 bottom-0 z-modal flex flex-col gap-4 rounded-t-lg bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-content shadow-lg md:inset-auto md:left-1/2 md:top-1/2 md:w-[28rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg">
          <AlertDialog.Title className="m-0 text-xl font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="m-0 text-content-secondary">
            {description}
          </AlertDialog.Description>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant={destructive ? "destructive" : "primary"}
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
