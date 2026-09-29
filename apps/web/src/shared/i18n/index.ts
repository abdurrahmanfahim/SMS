import { useSyncExternalStore } from "react";

import { flattenMessages } from "./flatten";

/* Loaded through the glob (not a static import) so tsconfig `include` need not list JSON files. */
const shell = import.meta.glob<unknown>("./{bn,en}.json", { eager: true, import: "default" });

export type Locale = "bn" | "en";
export const LOCALES: readonly Locale[] = ["bn", "en"];
/** Bangla first, English second (D-14, ux-standard section 5). */
export const DEFAULT_LOCALE: Locale = "bn";
export const LOCALE_STORAGE_KEY = "sms.locale";

export type Params = Record<string, string | number>;

const messages: Record<Locale, Record<string, string>> = {
  bn: flattenMessages(shell["./bn.json"]),
  en: flattenMessages(shell["./en.json"]),
};
const listeners = new Set<() => void>();

function isLocale(value: unknown): value is Locale {
  return value === "bn" || value === "en";
}

function readStoredLocale(): Locale {
  try {
    const stored = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage can be blocked; fall back to the default */
  }
  return DEFAULT_LOCALE;
}

let current: Locale = readStoredLocale();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Adds messages (flat, dotted keys). Used by the shell for feature translations. */
export function registerMessages(locale: Locale, extra: Record<string, string>): void {
  Object.assign(messages[locale], extra);
  emit();
}

export function getLocale(): Locale {
  return current;
}

/** Switches the language, persists the choice and keeps `<html lang>` in step. */
export function setLocale(locale: Locale): void {
  current = locale;
  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* choice just will not persist */
  }
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  emit();
}

/** All keys of a locale (used by tests and the missing-key script). */
export function messageKeys(locale: Locale): string[] {
  return Object.keys(messages[locale]);
}

/**
 * Translates `key` (`feature.section.key`) into the current language, replacing `{name}`
 * placeholders from `params`. Falls back to the other language, then to the key itself.
 */
export function t(key: string, params?: Params): string {
  const other: Locale = current === "bn" ? "en" : "bn";
  const template = messages[current][key] ?? messages[other][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current locale; components using it re-render when the language changes. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, getLocale);
}

/** `t` bound to a re-render on language change. */
export function useT(): typeof t {
  useLocale();
  return t;
}

if (typeof document !== "undefined") document.documentElement.lang = current;
