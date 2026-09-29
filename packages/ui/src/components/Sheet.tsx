import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./cn";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  /** "bottom" (default, phone pattern, at most 75% of the height) or "right" (side panel). */
  side?: "bottom" | "right";
  children?: ReactNode;
  footer?: ReactNode;
}

/** Bottom sheet for editing one small item. Always has a tappable close, never swipe-only. */
export function Sheet({
  open,
  onOpenChange,
  title,
  closeLabel,
  side = "bottom",
  children,
  footer,
}: SheetProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-sheet bg-black/50" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-sheet flex flex-col gap-4 overflow-y-auto bg-surface p-4 text-content shadow-lg",
            side === "bottom"
              ? "inset-x-0 bottom-0 max-h-[75vh] rounded-t-lg pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              : "inset-y-0 right-0 w-[min(24rem,100%)]",
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
          {children}
          {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
