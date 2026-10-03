import { Card } from "@sms/ui";
import { Link } from "react-router-dom";

import { useT } from "../../../shared/i18n";
import { useAcademic } from "../context";
import { ReadOnlyNote } from "../ui";

const SECTIONS = [
  { key: "years", path: "/app/academic/years" },
  { key: "levels", path: "/app/academic/levels" },
  { key: "sections", path: "/app/academic/sections" },
  { key: "subjects", path: "/app/academic/subjects" },
  { key: "classSubjects", path: "/app/academic/class-subjects" },
  { key: "assignments", path: "/app/academic/assignments" },
] as const;

export function HubPage() {
  const t = useT();
  const { canWrite } = useAcademic();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{t("academic.hub.title")}</h1>
      {canWrite ? null : <ReadOnlyNote />}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {canWrite ? (
          <li>
            <Link to="/app/academic/preset" className="block no-underline">
              <Card
                title={t("academic.hub.preset.title")}
                meta={[t("academic.hub.preset.description")]}
              />
            </Link>
          </li>
        ) : null}
        {SECTIONS.map((s) => (
          <li key={s.key}>
            <Link to={s.path} className="block no-underline">
              <Card
                title={t(`academic.hub.${s.key}.title`)}
                meta={[t(`academic.hub.${s.key}.description`)]}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
