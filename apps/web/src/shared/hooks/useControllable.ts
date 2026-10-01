import { useCallback, useState } from "react";

type Updater<T> = T | ((previous: T) => T);

/**
 * State that is controlled when `value` is given and internal otherwise. The setter accepts a
 * value or an updater function, matching what TanStack Table passes to its `onXChange` callbacks.
 */
export function useControllable<T>(
  value: T | undefined,
  onChange: ((next: T) => void) | undefined,
  initial: T,
): [T, (next: Updater<T>) => void] {
  const [internal, setInternal] = useState<T>(initial);
  const current = value !== undefined ? value : internal;
  const set = useCallback(
    (next: Updater<T>) => {
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(current) : next;
      if (value === undefined) setInternal(resolved);
      onChange?.(resolved);
    },
    [current, onChange, value],
  );
  return [current, set];
}
