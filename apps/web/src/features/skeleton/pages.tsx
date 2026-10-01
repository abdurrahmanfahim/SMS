import { Badge, Button, Card, Input } from "@sms/ui";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useLocale, useT } from "../../shared/i18n";

import { DASHBOARD_PATH, PICKER_PATH, SIGN_IN_PATH } from "./guards";
import {
  sessionStore,
  useSession,
  type InstitutionOption,
  type MembershipRole,
  type SessionStore,
} from "./session";

/** The institution's name in the current language, falling back to the other one. */
export function institutionName(option: InstitutionOption, locale: "bn" | "en"): string {
  const [first, second] =
    locale === "bn" ? [option.nameBn, option.nameEn] : [option.nameEn, option.nameBn];
  return first?.trim() || second?.trim() || "";
}

export function SignInPage({ store = sessionStore() }: { store?: SessionStore }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (email.trim() === "") next.email = t("skeleton.signIn.required");
    if (password === "") next.password = t("skeleton.signIn.required");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    const result = await store.signIn(email.trim(), password);
    setBusy(false);
    // On success the store changes and the page's guard redirects; the typed password is dropped.
    if (!result.ok) {
      setErrors({
        form: t(result.reason === "invalid" ? "skeleton.signIn.invalid" : "skeleton.signIn.failed"),
      });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-4">
      <h1 className="m-0 text-2xl font-semibold">{t("skeleton.signIn.title")}</h1>
      {errors.form ? (
        <p role="alert" className="m-0 text-danger">
          {t("common.state.error")}: {errors.form}
        </p>
      ) : null}
      <Input
        label={t("skeleton.signIn.email")}
        type="email"
        inputMode="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        errorPrefix={t("common.state.error")}
      />
      <Input
        label={t("skeleton.signIn.password")}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        errorPrefix={t("common.state.error")}
      />
      <Button type="submit" disabled={busy}>
        {t(busy ? "skeleton.signIn.submitting" : "skeleton.signIn.submit")}
      </Button>
    </form>
  );
}

export function PickInstitutionPage({ store = sessionStore() }: { store?: SessionStore }) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const session = useSession(store);
  if (session.status !== "signed_in") return null;

  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="m-0 text-2xl font-semibold">{t("skeleton.picker.title")}</h1>
      <p className="m-0">{t("skeleton.picker.hint")}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {session.institutions.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                store.selectInstitution(option.id);
                navigate(DASHBOARD_PATH);
              }}
            >
              <Card
                title={institutionName(option, locale)}
                meta={[option.roles.map((r: MembershipRole) => t(`shell.role.${r}`)).join(", ")]}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardPage({ store = sessionStore() }: { store?: SessionStore }) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const session = useSession(store);
  if (session.status !== "signed_in") return null;

  const active = session.institutions.find((i) => i.id === session.activeInstitutionId);

  return (
    <div className="flex max-w-xl flex-col gap-4" data-testid="page-dashboard">
      <h1 className="m-0 text-2xl font-semibold">
        {t("skeleton.dashboard.greeting", { name: session.fullName })}
      </h1>
      {active ? (
        <Card
          title={<span data-testid="institution-name">{institutionName(active, locale)}</span>}
          meta={[t("skeleton.dashboard.institution")]}
          trailing={
            <>
              {active.roles.map((role) => (
                <Badge key={role}>{t(`shell.role.${role}`)}</Badge>
              ))}
            </>
          }
        />
      ) : (
        <p role="status" className="m-0">
          {t("skeleton.dashboard.noInstitution")}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {session.institutions.length > 1 ? (
          <Button
            variant="secondary"
            onClick={() => {
              store.clearInstitution();
              navigate(PICKER_PATH);
            }}
          >
            {t("skeleton.dashboard.switch")}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => {
            void store.signOut().then(() => navigate(SIGN_IN_PATH, { replace: true }));
          }}
        >
          {t("skeleton.dashboard.signOut")}
        </Button>
      </div>
    </div>
  );
}
