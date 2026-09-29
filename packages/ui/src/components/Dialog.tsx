import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Accessible name of the close button (e.g. "Close"). Required: no hard-coded text here. */
  closeLabel: string;
  children?: ReactNode;
  footer?: ReactNode;
}

const OVERLAY = "fixed inset-0 z-modal bg-black/50";

/** Modal dialog. On phones it is a bottom drawer, from 768px a centred dialog. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  footer,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={OVERLAY} />
        <RadixDialog.Content
          className={cn(
            "fixed z-modal flex max-h-[85vh] flex-col gap-4 overflow-y-auto bg-surface p-4 text-content shadow-lg",
            "inset-x-0 bottom-0 rounded-t-lg pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
            "md:inset-auto md:left-1/2 md:top-1/2 md:w-[32rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <RadixDialog.Title className="m-0 text-xl font-semibold">{title}</RadixDialog.Title>
            <RadixDialog.Close
              aria-label={closeLabel}
              className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-md"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="m-0 text-content-secondary">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
          {children}
          {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
