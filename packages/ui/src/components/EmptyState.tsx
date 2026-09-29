import type { ReactNode } from "react";

/** Zero-data state: an icon, a real sentence in the DOM, and the primary action if one exists. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong p-6 text-center">
      {icon ? <div aria-hidden="true">{icon}</div> : null}
      <p className="m-0 text-lg font-semibold">{title}</p>
      {description ? <p className="m-0 text-content-secondary">{description}</p> : null}
      {action}
    </div>
  );
}
