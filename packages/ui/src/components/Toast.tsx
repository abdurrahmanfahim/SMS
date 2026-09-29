import * as RadixToast from "@radix-ui/react-toast";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { cn } from "./cn";

export type ToastTone = "success" | "danger" | "info";

export interface ToastInput {
  message: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => undefined);

const ICON = { success: CircleCheck, danger: CircleAlert, info: Info } as const;
/** Errors stay longer than successes (design-system.md, toast). */
const DURATION: Record<ToastTone, number> = { success: 6000, info: 6000, danger: 12000 };

/**
 * Wrap the app once. `closeLabel` and `viewportLabel` are supplied by the caller (translated).
 * Errors use assertive announcements, everything else polite.
 */
export function ToastProvider({
  children,
  closeLabel,
  viewportLabel,
}: {
  children: ReactNode;
  closeLabel: string;
  viewportLabel: string;
}) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((toast: ToastInput) => {
    setItems((current) => [...current, { ...toast, id: Date.now() + Math.random() }]);
  }, []);
  const remove = (id: number) => setItems((current) => current.filter((i) => i.id !== id));
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {items.map((item) => {
          const tone = item.tone ?? "info";
          const Icon = ICON[tone];
          return (
            <RadixToast.Root
              key={item.id}
              type={tone === "danger" ? "foreground" : "background"}
              duration={DURATION[tone]}
              onOpenChange={(open) => {
                if (!open) remove(item.id);
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-surface-raised p-3 text-content shadow-lg",
                tone === "danger" ? "border-2 border-danger" : "border-line",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-5 w-5 shrink-0",
                  tone === "danger" && "text-danger",
                  tone === "success" && "text-success",
                )}
              />
              <RadixToast.Description className="flex-1">{item.message}</RadixToast.Description>
              <RadixToast.Close
                aria-label={closeLabel}
                className="inline-flex min-h-tap min-w-tap items-center justify-center"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport
          label={viewportLabel}
          className="fixed inset-x-0 bottom-20 z-toast m-0 flex list-none flex-col gap-2 p-4 md:inset-x-auto md:right-0 md:bottom-0 md:w-[24rem]"
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

/** Returns `toast({ message, tone })`. */
export function useToast(): (toast: ToastInput) => void {
  return useContext(ToastContext);
}
