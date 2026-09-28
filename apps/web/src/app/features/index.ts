import { collectFeatures } from "./collect";

/**
 * Every feature registers itself in `src/features/<name>/register.ts` (routes, nav items,
 * widgets) and ships its texts in `src/features/<name>/i18n/{bn,en}.json`. The shell picks them
 * up here; feature tasks never edit shell files.
 */
const modules = import.meta.glob(
  ["../../features/*/register.ts", "../../features/*/i18n/{bn,en}.json"],
  { eager: true },
);

export const features = collectFeatures(modules);
