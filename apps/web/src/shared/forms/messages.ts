import { formatDate, formatNumber } from "../format";
import { t, type Params } from "../i18n";

const KEY = /^forms\.error\.[A-Za-z]+$/;

/**
 * Form errors travel through zod and react-hook-form as plain strings. To carry translation
 * parameters, a message is an i18n key with an optional query string: `forms.error.max?max=100`.
 * `formError` builds one, `translateFormError` turns one into text in the current language.
 */
export function formError(
  key: `forms.error.${string}`,
  params?: Record<string, string | number>,
): string {
  if (!params) return key;
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  return `${key}?${query.toString()}`;
}

/** Splits `key?a=1&b=2` into the key and its parameters. Returns null for text that is not one. */
export function parseFormError(
  message: string,
): { key: string; params: Record<string, string> } | null {
  const [key = "", query = ""] = message.split("?");
  if (!KEY.test(key)) return null;
  return { key, params: Object.fromEntries(new URLSearchParams(query)) };
}

const NUMBER_PARAMS = new Set(["min", "max"]);

/** Translates an error message from `formError`. Anything else (for example zod's built-in English text) becomes the generic "invalid" message so no untranslated text reaches the screen. */
export function translateFormError(message: string | undefined): string | undefined {
  if (!message) return undefined;
  const parsed = parseFormError(message);
  if (!parsed) return t("forms.error.invalid");
  const params: Params = {};
  const isDate = parsed.key === "forms.error.dateMin" || parsed.key === "forms.error.dateMax";
  for (const [name, value] of Object.entries(parsed.params)) {
    if (isDate && NUMBER_PARAMS.has(name))
      params[name] = formatDate(new Date(`${value}T00:00:00Z`));
    else if (NUMBER_PARAMS.has(name) && value !== "" && !Number.isNaN(Number(value)))
      params[name] = formatNumber(Number(value));
    else params[name] = value;
  }
  return t(parsed.key, params);
}
