import { useSyncExternalStore } from "react";

/** Tracks a CSS media query. Returns false where `matchMedia` does not exist (tests, server). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", listener);
      return () => list.removeEventListener("change", listener);
    },
    () =>
      typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false,
    () => false,
  );
}

/** True below the `md` breakpoint (768px): the phone layout. */
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
