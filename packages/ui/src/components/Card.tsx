import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  /** Up to three short metadata lines. */
  meta?: ReactNode[];
  /** Trailing status (a Badge) or chevron. */
  trailing?: ReactNode;
  leading?: ReactNode;
}

/** Phone-first list item. For a tappable card wrap it in a link or button yourself (one target). */
export function Card({ title, meta, trailing, leading, className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-line bg-surface-raised p-4 shadow-sm",
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        {title ? <div className="truncate font-semibold">{title}</div> : null}
        {meta?.slice(0, 3).map((line, i) => (
          <div key={i} className="truncate text-sm text-content-secondary">
            {line}
          </div>
        ))}
        {children}
      </div>
      {trailing}
    </div>
  );
}
