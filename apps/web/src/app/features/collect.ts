import type { RouteObject } from "react-router-dom";

import type { FeatureRegistration, HomeWidget } from "../../shared/features";
import type { NavItem } from "../../shared/nav";

export type Locale = "bn" | "en";
export type Translations = Record<Locale, Record<string, string>>;

export interface CollectedFeatures {
  routes: RouteObject[];
  navItems: NavItem[];
  widgets: HomeWidget[];
  translations: Translations;
}

const REGISTER_RE = /(?:^|\/)features\/([^/]+)\/register\.ts$/;
const I18N_RE = /(?:^|\/)features\/([^/]+)\/i18n\/(bn|en)\.json$/;

/** Flattens `{ a: { b: "x" } }` into `{ "a.b": "x" }`. Non-string leaves are rejected. */
export function flattenMessages(input: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(`i18n file must contain an object${prefix ? ` at "${prefix}"` : ""}`);
  }
  for (const [key, value] of Object.entries(input)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[full] = value;
    else if (typeof value === "object" && value !== null && !Array.isArray(value))
      Object.assign(out, flattenMessages(value, full));
    else throw new Error(`i18n value at "${full}" must be a string or an object`);
  }
  return out;
}

/** JSON imported through Vite arrives as `{ default: {...} }`; a plain object is also fine. */
function jsonBody(mod: unknown): unknown {
  if (typeof mod === "object" && mod !== null && "default" in mod) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}

function asArray<T>(value: unknown, what: string, path: string): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${path}: "${what}" must be an array`);
  return value as T[];
}

/**
 * Pure merge of every feature module into one set of routes, nav items, widgets and translations.
 * `modules` is the result of `import.meta.glob` (or a fake map in tests), keyed by file path:
 * `.../features/<name>/register.ts` and `.../features/<name>/i18n/{bn,en}.json`.
 * Modules are processed in sorted path order so the result is deterministic.
 * Throws on a duplicate nav key, widget key or translation key.
 */
export function collectFeatures(modules: Record<string, unknown>): CollectedFeatures {
  const result: CollectedFeatures = {
    routes: [],
    navItems: [],
    widgets: [],
    translations: { bn: {}, en: {} },
  };
  const navKeys = new Set<string>();
  const widgetKeys = new Set<string>();
  const messageOwner: Record<Locale, Map<string, string>> = { bn: new Map(), en: new Map() };

  for (const path of Object.keys(modules).sort()) {
    const mod = modules[path];

    const register = REGISTER_RE.exec(path);
    if (register) {
      const reg = mod as Partial<FeatureRegistration>;
      result.routes.push(...asArray<RouteObject>(reg.routes, "routes", path));
      for (const item of asArray<NavItem>(reg.navItems, "navItems", path)) {
        if (navKeys.has(item.key)) throw new Error(`${path}: duplicate nav item key "${item.key}"`);
        navKeys.add(item.key);
        result.navItems.push(item);
      }
      for (const widget of asArray<HomeWidget>(reg.widgets, "widgets", path)) {
        if (widgetKeys.has(widget.key))
          throw new Error(`${path}: duplicate widget key "${widget.key}"`);
        widgetKeys.add(widget.key);
        result.widgets.push(widget);
      }
      continue;
    }

    const i18n = I18N_RE.exec(path);
    if (i18n) {
      const feature = i18n[1] as string;
      const locale = i18n[2] as Locale;
      for (const [key, text] of Object.entries(flattenMessages(jsonBody(mod)))) {
        const owner = messageOwner[locale].get(key);
        if (owner !== undefined && owner !== feature) {
          throw new Error(`${path}: i18n key "${key}" is already defined by feature "${owner}"`);
        }
        messageOwner[locale].set(key, feature);
        result.translations[locale][key] = text;
      }
    }
  }
  return result;
}
