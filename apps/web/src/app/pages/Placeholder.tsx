import { useT } from "../../shared/i18n";

/** Temporary page body for a route group until real content is added. */
export function Placeholder({ name }: { name: string }) {
  const t = useT();
  return <p data-testid={`page-${name}`}>{t("shell.home.placeholder")}</p>;
}
