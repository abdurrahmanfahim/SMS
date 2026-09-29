import { useLocale, setLocale, useT, LOCALES, type Locale } from "../../shared/i18n";
import { useRole } from "../../shared/role";
import { ROLES, type Role } from "../../shared/roles";

const LOCALE_LABEL: Record<Locale, string> = { bn: "বাংলা", en: "English" };

/** Language switcher: Bangla or English, persisted. Labels are shown in their own language. */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  return (
    <div role="group" aria-label={t("shell.language.label")} className="flex gap-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          className={`min-h-tap min-w-tap rounded-md border px-3 text-sm ${
            locale === l
              ? "border-primary bg-primary text-primary-fg"
              : "border-line-strong bg-surface text-content"
          }`}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

/** Developer-only: pick the current role to exercise the role-filtered navigation. */
export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const t = useT();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span>{t("shell.role.label")}</span>
      <select
        value={role ?? ""}
        onChange={(e) => setRole(e.target.value as Role)}
        className="min-h-tap rounded-md border border-line-strong bg-surface px-2 text-content"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {t(`shell.role.${r}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
