import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** Error pattern: what happened, what to do next, no codes (ux-standard section 6). */
export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border-2 border-danger p-6 text-center"
    >
      <CircleAlert aria-hidden="true" className="h-8 w-8 text-danger" />
      <p className="m-0 text-lg font-semibold">{title}</p>
      {description ? <p className="m-0 text-content-secondary">{description}</p> : null}
      {action}
    </div>
  );
}
