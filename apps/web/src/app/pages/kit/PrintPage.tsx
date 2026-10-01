import { Link } from "react-router-dom";

import { useT } from "../../../shared/i18n";
import { PageBreak, PrintButton, PrintLayout } from "../../../shared/print";

import { makeStudents } from "./demoData";

const ROWS_PER_PART = 18;
const students = makeStudents(ROWS_PER_PART * 3);

function Part({ index }: { index: number }) {
  const t = useT();
  const rows = students.slice(index * ROWS_PER_PART, (index + 1) * ROWS_PER_PART);
  return (
    <section>
      <h2 style={{ margin: "0 0 3mm", fontSize: "13pt" }}>
        {t("devkit.kit.printPart", { part: String(index + 1) })}
      </h2>
      <table>
        <thead>
          <tr>
            <th>{t("devkit.kit.colRoll")}</th>
            <th>{t("devkit.kit.colName")}</th>
            <th>{t("devkit.kit.colSection")}</th>
            <th>{t("devkit.kit.colPhone")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.id}>
              <td>{index * ROWS_PER_PART + i + 1}</td>
              <td>{s.name}</td>
              <td>{s.section}</td>
              <td>{s.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Dev-only 3-page A4 sample: header and footer repeat on every page, signatures close page 3. */
export function PrintPage() {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <PrintButton />
        <Link to="/dev/kit" className="sms-no-print min-h-tap py-2 text-link underline">
          {t("devkit.kit.title")}
        </Link>
      </div>
      <PrintLayout
        header={
          <div style={{ textAlign: "center", paddingBottom: "4mm" }}>
            <strong style={{ fontSize: "15pt" }}>{t("devkit.kit.printInstitution")}</strong>
            <div>{t("devkit.kit.printTitle")}</div>
          </div>
        }
        footer={
          <div style={{ textAlign: "center", fontSize: "9pt", paddingTop: "3mm" }}>
            {t("devkit.kit.printFooter")}
          </div>
        }
        signatures={[{ label: t("devkit.kit.printTeacher") }, { label: t("devkit.kit.printHead") }]}
      >
        <Part index={0} />
        <PageBreak />
        <Part index={1} />
        <PageBreak />
        <Part index={2} />
      </PrintLayout>
    </div>
  );
}
