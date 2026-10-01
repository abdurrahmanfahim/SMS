import { Badge, Button, useToast } from "@sms/ui";
import { createColumnHelper } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { useT } from "../../../shared/i18n";
import { DataTable, useTableState, type ServerTableParams } from "../../../shared/table";

import { type DemoStudent, makeStudents } from "./demoData";

const helper = createColumnHelper<DemoStudent>();

/** Fake "server": filters, sorts and pages an in-memory list after a short delay. */
function fakeFetch(all: DemoStudent[], params: ServerTableParams) {
  let rows = all;
  if (params.search) rows = rows.filter((r) => r.name.includes(params.search));
  if (params.filters["section"]) rows = rows.filter((r) => r.section === params.filters["section"]);
  const sort = params.sort[0];
  if (sort) {
    const key = sort.id as keyof DemoStudent;
    rows = [...rows].sort((a, b) => {
      const result = a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0;
      return sort.desc ? -result : result;
    });
  }
  const start = (params.page - 1) * params.pageSize;
  return { rows: rows.slice(start, start + params.pageSize), total: rows.length };
}

export function TableDemo() {
  const t = useT();
  const toast = useToast();
  const columns = useMemo(
    () => [
      helper.accessor("name", {
        header: t("devkit.kit.colName"),
        size: 220,
        meta: { card: "title", filter: { type: "text" } },
      }),
      helper.accessor("roll", {
        header: t("devkit.kit.colRoll"),
        size: 100,
        meta: { align: "end", card: "meta" },
      }),
      helper.accessor("section", {
        header: t("devkit.kit.colSection"),
        size: 120,
        meta: {
          card: "subtitle",
          filter: {
            type: "select",
            options: ["ক", "খ", "গ"].map((s) => ({ value: s, label: s })),
          },
        },
      }),
      helper.accessor("phone", {
        header: t("devkit.kit.colPhone"),
        size: 180,
        enableSorting: false,
        meta: { card: "meta" },
      }),
      helper.accessor("present", {
        header: t("devkit.kit.colStatus"),
        size: 140,
        enableSorting: false,
        meta: { card: "trailing" },
        cell: (info) =>
          info.getValue() ? (
            <Badge tone="success">{t("devkit.kit.present")}</Badge>
          ) : (
            <Badge tone="danger">{t("devkit.kit.absent")}</Badge>
          ),
      }),
    ],
    [t],
  );

  const bigList = useMemo(() => makeStudents(10_000), []);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const serverAll = useMemo(() => makeStudents(240), []);
  const { tableProps, params } = useTableState({ pageSize: 25 });
  const [state, setState] = useState<{ rows: DemoStudent[]; total: number; loading: boolean }>({
    rows: [],
    total: 0,
    loading: true,
  });
  const [failing, setFailing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    const id = setTimeout(() => {
      setState({ ...fakeFetch(serverAll, params), loading: false });
    }, 250);
    return () => clearTimeout(id);
    // `params` is covered by paramsKey; `attempt` re-runs the fetch on retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, serverAll, attempt]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="m-0 text-lg font-semibold">{t("devkit.kit.tableClientTitle")}</h3>
        <DataTable
          label={t("devkit.kit.tableLabelClient")}
          columns={columns}
          data={bigList}
          getRowId={(s) => s.id}
          getRowLabel={(s) => s.name}
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          enableRowSelection
          onRowClick={(s) =>
            toast({ message: t("devkit.kit.tableOpened", { name: s.name }), tone: "info" })
          }
          maxHeight="28rem"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="m-0 text-lg font-semibold">{t("devkit.kit.tableServerTitle")}</h3>
        <div>
          <Button variant="secondary" onClick={() => setFailing((f) => !f)}>
            {failing ? t("devkit.kit.tableClearError") : t("devkit.kit.tableSimulateError")}
          </Button>
        </div>
        <DataTable
          {...tableProps}
          label={t("devkit.kit.tableLabelServer")}
          columns={columns}
          data={state.rows}
          rowCount={state.total}
          getRowId={(s) => s.id}
          getRowLabel={(s) => s.name}
          pageSizeOptions={[10, 25, 50]}
          loading={state.loading}
          error={failing}
          onRetry={() => {
            setFailing(false);
            setAttempt((n) => n + 1);
          }}
          maxHeight="28rem"
        />
      </section>
    </div>
  );
}
