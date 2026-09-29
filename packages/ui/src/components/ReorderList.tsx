import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";

export interface ReorderListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onChange: (items: T[]) => void;
  /** Accessible names for the buttons, e.g. (item) => `Move ${name} up`. Supplied by the caller. */
  moveUpLabel: (item: T) => string;
  moveDownLabel: (item: T) => string;
}

/**
 * Reordering with up and down buttons (WCAG 2.5.7): never depends on dragging. Drag can be added
 * on top by a feature, but these buttons must stay.
 */
export function ReorderList<T>({
  items,
  getKey,
  renderItem,
  onChange,
  moveUpLabel,
  moveDownLabel,
}: ReorderListProps<T>) {
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [item] = next.splice(from, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    onChange(next);
  }
  const buttonClass =
    "inline-flex min-h-tap min-w-tap items-center justify-center rounded-md border border-line-strong bg-surface disabled:opacity-40";
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((item, index) => (
        <li
          key={getKey(item)}
          className="flex items-center gap-2 rounded-lg border border-line bg-surface-raised p-2"
        >
          <div className="min-w-0 flex-1">{renderItem(item)}</div>
          <button
            type="button"
            className={buttonClass}
            aria-label={moveUpLabel(item)}
            disabled={index === 0}
            onClick={() => move(index, index - 1)}
          >
            <ArrowUp aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-label={moveDownLabel(item)}
            disabled={index === items.length - 1}
            onClick={() => move(index, index + 1)}
          >
            <ArrowDown aria-hidden="true" className="h-5 w-5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
