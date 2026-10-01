# Results engine spec v0 (task M1-L1)

Status: v0. The general-education GPA-5 rules below are cross-checked against several public sources (§11). Madrasa, Qawmi and coaching rules are **unknown** and must come from the M0-O1 interviews; everything here is configuration, not hard-coded. The engine is a pure function in `@sms/domain` and runs on the server for official results (D-17).

## 1. Inputs and vocabulary

- **Exam** for one class level → **subjects** (`exam_subjects`) → each subject has one or more **papers** (for example Bangla 1st and 2nd paper) → each paper has **components** (`exam_components`: written, MCQ, practical, class test…). Real sheets combine two papers into one subject total and grade.
- **Marks:** `value` or a `mark_code` (`absent`, `exempt`, `withheld`). No row means not entered.
- **Optional subject (4th subject):** chosen per student (`enrollment_subjects.is_chosen_optional`).
- Domain model additions (also patched into `domain-model.md`): `exam_components.paper smallint default 1` and `exam_subjects.pass_rule jsonb null`.

## 2. Numeric rules

- No floating point. Marks are integers in hundredths. Percent comparisons use cross-multiplication (`total × 100 ≥ min × full`). Rounding happens only at the end, as configured.
- Band thresholds use `min` inclusive on percent of full marks: a subject at 79.99% is A, at 80.00% is A+.
- Default rounding for GPA: 2 decimals, half up. The sample marksheet in §9 shows 22/6 published as 3.67, which is rounding, not truncation. Confirm on each institution's sheets.

## 3. Pipeline (in order)

1. **Validate:** every value between 0 and its component full marks; codes valid; missing marks are reported (policy `missing`: `block` by default, or `treat_as_absent`).
2. **Convert (optional):** a component may define `convert_to`; converted = raw × convert_to / full (exact fraction).
3. **Subject total and full:** sum of converted component marks across all papers, and the sum of converted full marks. Exempt components and subjects are excluded from both.
4. **Subject percent** = total / full.
5. **Pass checks** (subject `pass_rule`, else the scheme default): the subject total must reach `min_percent_total` (default 33), and each **group** must reach its `min_percent`, where a group sums chosen component codes across all papers. Sample sheet note: MCQ (paper 1 plus paper 2) and CQ (paper 1 plus paper 2) must each be at least 33%.
6. **Grade and point** from `bands` by subject percent. A subject that fails any pass check gets the `fail` grade and point regardless of its total.
7. **Overall** (§4–§5).
8. **Ranking** (§6).

## 4. Absent, exempt, withheld

- `absent` in a counted component: the component counts as 0 and the subject fails. If the student is absent in every counted subject, the outcome is `absent`.
- `exempt`: excluded from totals and from the denominator.
- `withheld`: the whole result is `withheld` (no GPA, no rank) until fixed.

## 5. Overall result

- **Totals:** sum of subject totals of counted subjects; average percent = sum of totals / sum of full marks.
- **GPA scheme (`gpa_bands`):** `gpa = (sum of points of compulsory counted subjects + optional_bonus) / number of compulsory counted subjects`, capped at `max_point` (5.00). `optional_bonus = max(0, optional_point − threshold)` with default threshold 2.00. The optional subject is not in the denominator, and failing it never fails the student.
- **Fail rule:** if any compulsory counted subject fails, the outcome is `failed`, the overall grade is the fail grade and GPA is shown as 0.00 (`fail_gpa_value`). Failed subjects are listed.
- **Percentage scheme (`percentage_bands`):** outcome `passed` when all counted subjects pass; overall grade or division from the average percent bands. No GPA.
- **Overall letter from GPA** uses `gpa_grade_bands` (default in the preset below). This mapping is inferred from the sample marksheet and common practice; verify it.

## 6. Ranking

- Config `ranking.order`: an ordered list of keys from `outcome` (passed first), `gpa_desc`, `total_desc`, `subject:<class_subject_id>_desc`, `roll_asc`. Default: `outcome`, `total_desc`, `gpa_desc`, `roll_asc` (confirm with interviews: many schools rank by total, because GPA ties are common).
- `ranking.ties`: `competition` (1, 2, 2, 4) or `dense` (1, 2, 2, 3). Scopes: `class` and `section`. `include_failed`: false by default, so failed students get no rank.
- Withheld and absent students get no rank.

**Implemented definitions (M2-D2, accepted; see `docs/decisions/leader-rulings.md` R-09).** Ranks are computed on the stored hundredths. "Top N" returns every student with `class_rank <= N`, so ties may return more than N. Pass rate is `passed / appeared`. Subject averages cover students who appeared. Failed students count in overall averages with their stored total and GPA. `withheld` and `absent` students are never ranked.

## 7. Config schema (`grade_schemes.config`, version 1)

```json
{
  "version": 1,
  "kind": "gpa_bands",
  "bands": [
    { "min": 80, "grade": "A+", "point": 5.0, "remark_bn": "অসাধারণ" },
    { "min": 70, "grade": "A", "point": 4.0 },
    { "min": 60, "grade": "A-", "point": 3.5 },
    { "min": 50, "grade": "B", "point": 3.0 },
    { "min": 40, "grade": "C", "point": 2.0 },
    { "min": 33, "grade": "D", "point": 1.0 },
    { "min": 0, "grade": "F", "point": 0.0 }
  ],
  "fail": { "grade": "F", "point": 0.0 },
  "pass": { "min_percent_total": 33, "groups": [] },
  "gpa": {
    "max_point": 5.0,
    "optional": { "enabled": true, "threshold": 2.0 },
    "fail_if_any_compulsory_fails": true,
    "fail_gpa_value": 0.0,
    "grade_bands": [
      { "min": 5.0, "grade": "A+" },
      { "min": 4.0, "grade": "A" },
      { "min": 3.5, "grade": "A-" },
      { "min": 3.0, "grade": "B" },
      { "min": 2.0, "grade": "C" },
      { "min": 1.0, "grade": "D" },
      { "min": 0.0, "grade": "F" }
    ]
  },
  "missing": "block",
  "rounding": { "marks_decimals": 2, "gpa_decimals": 2, "mode": "half_up" },
  "ranking": {
    "order": ["outcome", "total_desc", "gpa_desc", "roll_asc"],
    "ties": "competition",
    "scopes": ["class", "section"],
    "include_failed": false
  }
}
```

Presets shipped in `@sms/domain`: `bd-general-gpa5` (the config above; bands verified, see §11). More presets (legacy divisions, madrasa, Qawmi, coaching) are added only from real samples.

## 8. Publish snapshot

- `result_snapshots.rules` stores the full scheme, subject rules and engine version at publish time. `result_rows.subjects` and `.totals` store per-subject and overall results exactly as computed (component marks, total, full, percent, grade, point, passed, reasons for failure).
- `checksum` is SHA-256 over canonical JSON (sorted keys, no whitespace) of rules plus all rows. A verify function recomputes it. Republish creates version n+1 and marks the previous `superseded`. Unpublish marks `revoked`; nothing is edited in place.

**Implemented shapes (M2-D1, accepted).** The authoritative shapes of `result_rows.subjects` entries (`SubjectResult`) and `result_rows.totals` (`OverallResult`) are the TSDoc types in `packages/domain/src/results/compute.ts`; snapshots store them unchanged. Percentages are stored as `percent_bp` and `average_percent_bp` (hundredths of a percent, 66.5% = 6650); marks and points are integer hundredths; `computeExam` returns `{ engine_version, students[] }`, students sorted by id, subjects by subject id; `ENGINE_VERSION` goes into the snapshot `rules`; the checksum is `snapshotChecksum` (SHA-256 of canonical JSON of rules and rows), verified by `verifySnapshot`. Grade from GPA uses the rounded GPA. See `docs/decisions/leader-rulings.md` R-01.

## 9. Worked example (fixture G-001)

From a public government-college test-exam marksheet (names removed; see §11). Components per subject: MCQ, CQ, practical for paper 1 and paper 2. The college maps the subject total on 200 marks to points with the same bands as percent (160–200 → 5, 140–159 → 4, 120–139 → 3.5, 100–119 → 3, 80–99 → 2, 66–79 → 1, 0–65 → 0), so percent bands reproduce it. Component full marks below are inferred where the sheet does not show them; confirm before using the fixture.

| Subject                | Total / full | Percent | Point | Note                                                                      |
| ---------------------- | ------------ | ------- | ----- | ------------------------------------------------------------------------- |
| Bangla                 | 133 / 200    | 66.5    | 3.5   |                                                                           |
| English                | 151 / 200    | 75.5    | 4     |                                                                           |
| ICT                    | 53 / 100     | 53      | 3     |                                                                           |
| Physics                | 145 / 200    | 72.5    | 4     |                                                                           |
| Chemistry              | 134 / 200    | 67      | 3.5   |                                                                           |
| Biology                | 140 / 200    | 70      | 4     |                                                                           |
| Mathematics (optional) | 93 / 200     | 46.5    | 0     | fails the CQ group (27 marks over two papers is under 33%), so F; bonus 0 |

GPA = (3.5 + 4 + 3 + 4 + 3.5 + 4) / 6 = 22 / 6 = 3.666… → **3.67**, overall grade **A-**, outcome **passed** (failing the optional subject does not fail the student). This matches the sheet. It tests: group pass rule, optional subject, half-up rounding, two-paper subjects.

## 10. Golden and property tests

- Fixtures live in `packages/domain/fixtures/results/*.json`: `{ id, source, scheme, exam, students: [...], expected: {...} }`. Real fixtures come from M0-O1 samples with names removed. Each institution format gets at least 3 students: a pass, a fail (by total and by component group), an absent, and one with an optional subject.
- Required fixtures: G-001 above, boundaries (79.99 vs 80.00, 32.99 vs 33.00), all-A+ with optional bonus above the cap, exempt subject, withheld, ties in ranking (competition and dense).
- Properties: more marks never lower a grade point; GPA within 0 and `max_point`; component sums equal subject totals; recomputing gives an identical checksum; no floating-point drift (integer math only); ranking respects the configured order.

## 11. Open questions for interviews

1. Do institutions combine several exams into one annual result (weighted terms)? If yes, add `result_sets` (out of v1 unless most pilots need it).
2. Grace marks to pass: used, and how?
3. How do madrasas (Alia, Qawmi) and coaching centres grade? Which scale, which pass rule?
4. Ranking: by total, by GPA, or by named subjects? Ties?
5. Rounding: half up or truncation on real sheets?
6. Are per-paper or per-component pass marks used at school level, or only at board level?

## 12. Sources (access date 2026-09-20; verify against the current board circular before shipping)

- Grade scale 80–100 → 5.00 down to 0–32 → 0.00: Wikipedia, Academic grading in Bangladesh (https://en.wikipedia.org/wiki/Academic_grading_in_Bangladesh); Nuffic (https://www.nuffic.nl/en/node/242); a board-issued SSC certificate legend (https://international.iitkgp.ac.in/media/uploads/Degree_Applications/2021/priyanka.ddewan@gmail.com/SSC_certificate_and_marksheet.pdf).
- Revised system adding A- and treating an F in any subject as blocking higher studies: The Daily Star (https://www.thedailystar.net/node/1064557).
- Optional (4th) subject: point minus 2 is added as a buffer and the total is divided by the number of compulsory subjects: The Daily Star, 2006 (https://archive.thedailystar.net/rising/2006/08/01/index.htm; informal article, secondary); cap at 5.00: reader letter, The Daily Star, 2004 (https://archive.thedailystar.net/2004/10/04/d41004110989.htm; secondary).
- Sample marksheet with paper and component columns, "4th Sub GP (Above 2)" column and component-group pass note: Kushtia Govt. College (https://kushtiagovcollege.edu.bd/wp-content/uploads/2023/07/Science_XII-Test-Result-2023.pdf).
