// Builds the Munshi parity fixtures: runs Munshi's own computation (docs/samples/munshi/compute.js)
// over each anonymised backup and writes, per exam (Munshi "form"), the SMS engine input plus
// Munshi's answers to packages/domain/fixtures/munshi-parity/. Run from packages/domain:
//   node scripts/munshi-parity-fixtures.mjs
// This script is a one-off tool, not part of the shipped engine: it may use floating point because
// it reproduces Munshi, which does.
import { Buffer } from "node:buffer";
import console from "node:console";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const samples = "docs/samples/munshi/";
const outDir = fileURLToPath(new URL("../fixtures/munshi-parity/", import.meta.url));

// compute.js is an ES module outside any package, so load it from a data URL.
const computeSource = readFileSync(root + samples + "compute.js", "utf8");
const munshi = await import(
  "data:text/javascript;base64," + Buffer.from(computeSource, "utf8").toString("base64")
);

const BACKUPS = [
  "nomborpotro-backup-2026-09-01.anonymised.json",
  "nomborpotro-backup-2026-10-01.anonymised.json",
];

mkdirSync(outDir, { recursive: true });
const summary = []; // one entry per backup, listing every Munshi exam and whether it was compared

/** Builds one fixture from a Munshi form definition and its responses, using Munshi's own code. */
function buildFixture({ id, source, form, responses, rollOf }) {
  const raws = form.fields.filter((f) => f.type === "raw_marks");
  const gradeField = form.fields.find((f) => f.type === "grade");
  const meritField = form.fields.find((f) => f.type === "merit_rank");
  const averageField = form.fields.find((f) => f.type === "average");
  const totalField = form.fields.find((f) => f.type === "total");
  const merit = meritField ? munshi.computeMeritRanks(form.fields, responses, meritField) : null;

  let scheme;
  if (gradeField) {
    // Munshi grade ranges become SMS percentage bands by their `min`; the lowest range is the fail
    // grade and the next range's `min` is the pass mark (assumption A-1 in docs/research/munshi-parity.md).
    const ranges = [...gradeField.config.ranges].sort((a, b) => a.min - b.min);
    scheme = {
      version: 1,
      kind: "percentage_bands",
      bands: ranges.map((r) => ({ min: r.min, grade: r.label })),
      fail: { grade: ranges[0].label },
      pass: { min_percent_total: ranges[1].min, groups: [] },
    };
  } else {
    scheme = {
      version: 1,
      kind: "percentage_bands",
      bands: [{ min: 0, grade: "-" }],
      fail: { grade: "F" },
      pass: { min_percent_total: 0, groups: [] },
    };
  }

  const students = responses.map((r) => {
    const derived = munshi.computeDerivedValues(form.fields, r.values);
    const marks = {};
    const issues = {};
    for (const f of raws) {
      const value = r.values[f.id];
      const issue = munshi.markIssue(value, f.config.max);
      if (issue !== null) issues["f" + f.id] = issue;
      if (value === undefined || value === null || value === "") continue; // not entered
      marks["f" + f.id] = { written: Math.round(munshi.num(value) * 100) };
    }
    const entry = {
      id: "s" + r.studentId,
      roll: rollOf(r.studentId),
      marks,
      munshi: {
        total: totalField ? derived[totalField.id] : null,
        average: averageField ? derived[averageField.id] : null,
        grade: gradeField ? derived[gradeField.id] : null,
        merit_rank: meritField ? merit.get(r.studentId) : null,
      },
    };
    if (Object.keys(issues).length > 0) entry.munshi.mark_issues = issues;
    return entry;
  });

  return {
    id,
    source: {
      ...source,
      form_name: form.name,
      munshi_code: samples + "compute.js",
      munshi_functions: ["computeDerivedValues", "computeMeritRanks", "markIssue"],
      average_uses_percentage: averageField ? Boolean(averageField.config.usePercentage) : null,
      has_merit_rank: Boolean(meritField),
      merit_top_n: meritField ? (meritField.config.topN ?? null) : null,
    },
    scheme,
    subjects: raws.map((f) => ({
      id: "f" + f.id,
      label: f.label,
      components: [{ id: "written", paper: 1, code: "written", full: f.config.max }],
    })),
    students,
  };
}

function save(fixture) {
  writeFileSync(outDir + fixture.id + ".json", JSON.stringify(fixture, null, 2) + "\n");
  console.log(fixture.id, "students", fixture.students.length, "subjects", fixture.subjects.length);
}

// 1) The anonymised backups: every Munshi exam that has marks.
for (const file of BACKUPS) {
  const data = JSON.parse(readFileSync(root + samples + file, "utf8")).data;
  const stamp = file.match(/\d{4}-\d{2}-\d{2}/)[0];
  const roster = new Map(data.roster.map((s) => [s.id, s]));
  const forms = [];
  summary.push({ file: samples + file, forms });
  const rollOf = (studentId) => {
    const text = munshi.toEnglishDigits(String(roster.get(studentId)?.rollNo ?? ""));
    return /^\d+$/.test(text) ? Number(text) : null;
  };
  for (const form of data.forms) {
    const responses = data.responses.filter((r) => r.formId === form.id && !r.isDraft);
    const raws = form.fields.filter((f) => f.type === "raw_marks");
    const compared = raws.length > 0 && responses.length > 0;
    forms.push({
      form_id: form.id,
      name: form.name,
      fields: form.fields.length,
      responses: responses.length,
      compared,
    });
    if (!compared) continue;
    save(
      buildFixture({
        id: `P-${stamp}-form${form.id}`,
        source: { backup: samples + file, form_id: form.id, synthetic: false },
        form,
        responses,
        rollOf,
      }),
    );
  }
}

// 2) Probes: invented marks, only to exercise rules the backups never reach. Munshi's answers
// still come from Munshi's own code. Labelled `synthetic: true`; they contain no student data.
const munshiRanges = [
  { min: 80, max: 100, label: "A+" },
  { min: 70, max: 79, label: "A" },
  { min: 60, max: 69, label: "A-" },
  { min: 33, max: 59, label: "পাস" },
  { min: 0, max: 32, label: "ফেল" },
];
const probeForm = (name, withMerit) => ({
  name,
  fields: [
    { id: "a", type: "raw_marks", label: "subject a", config: { max: 100 } },
    { id: "b", type: "raw_marks", label: "subject b", config: { max: 100 } },
    { id: "c", type: "raw_marks", label: "subject c", config: { max: 100 } },
    { id: "t", type: "total", label: "total", config: { sourceFieldIds: ["a", "b", "c"] } },
    {
      id: "m",
      type: "average",
      label: "average",
      config: { sourceFieldIds: ["a", "b", "c"], usePercentage: false },
    },
    {
      id: "g",
      type: "grade",
      label: "grade",
      config: { sourceFieldId: "m", ranges: munshiRanges },
    },
    ...(withMerit
      ? [{ id: "r", type: "merit_rank", label: "rank", config: { sourceFieldId: "t", topN: 3 } }]
      : []),
  ],
});
const probeResponses = (rows) =>
  rows.map(([studentId, a, b, c]) => ({ studentId, values: { a, b, c } }));

save(
  buildFixture({
    id: "P-probe-rules",
    source: { backup: null, synthetic: true },
    form: probeForm("probe: grade rules", true),
    responses: probeResponses([
      [101, "79", "80", "79"], // average 79.33: in the gap between the A+ and A ranges
      [102, "100", "100", "20"], // average 73.33 but one subject below the pass mark
      [103, "80", "80", "80"], // exactly on the A+ boundary
      [104, "33", "33", "33"], // exactly on the pass mark
      [105, "70", "60", "65"], // average 65
      [106, "90", "95", "85"],
      [107, "32", "32", "32"], // just below the pass mark
      [108, "70", "70", "69"], // average 69.67: in the gap between the A and A- ranges
      [109, "80", "80", "80"], // tie with 103
    ]),
    rollOf: () => null,
  }),
);
save(
  buildFixture({
    id: "P-probe-entry",
    source: { backup: null, synthetic: true },
    form: probeForm("probe: entry problems", false),
    responses: probeResponses([
      [201, "90", "90", ""], // a blank mark
      [202, "120", "50", "50"], // a mark above the full marks
      [203, "50", "60", "70"], // a normal student
    ]),
    rollOf: () => null,
  }),
);
writeFileSync(outDir + "index.json", JSON.stringify({ backups: summary }, null, 2) + "\n");
