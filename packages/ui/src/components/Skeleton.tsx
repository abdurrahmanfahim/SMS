import { cn } from "./cn";

/**
 * Loading placeholder. Give `label` (for example "Loading") so a screen reader hears the state;
 * the shapes themselves are hidden from assistive tech.
 */
export function Skeleton({
  label,
  className,
  lines = 1,
}: {
  label: string;
  className?: string;
  lines?: number;
}) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn("h-4 animate-pulse rounded-md bg-surface-subtle", className)}
        />
      ))}
    </div>
  );
}
