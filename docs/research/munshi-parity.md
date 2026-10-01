# Munshi parity (M2-D3)

How far the SMS results engine (`packages/domain/src/results/`) agrees with Munshi's own computation (`docs/samples/munshi/compute.js`), and why it differs where it does. Written for task `M2-D3`; the tests that enforce it are `packages/domain/src/results/munshi-parity.test.ts`.

## 1. Method

1. `packages/domain/scripts/munshi-parity-fixtures.mjs` loads `compute.js` and runs Munshi's own `computeDerivedValues`, `computeMeritRanks` and `markIssue` over every Munshi exam ("form") that has marks in the two anonymised backups. It writes one fixture per exam to `packages/domain/fixtures/munshi-parity/` containing the marks, Munshi's answers and the source file names. Rerun: `cd packages/domain && node scripts/munshi-parity-fixtures.mjs`.
2. The same marks go to the SMS engine (`computeExam`, `rankResults`). Each Munshi raw-marks field becomes one SMS subject with one component whose full marks are the field's `max`. Marks become whole hundredths.
3. Every value both systems define is compared: total, average, grade and merit position (and, for invalid entries, whether the student can be computed at all).
4. Any difference must be listed in `fixtures/munshi-parity/differences.json` with a cause below. The test fails on an unlisted difference and on a listed one that no longer happens.

## 2. What was compared

| Source                                              | Exams with marks                                 | Students | Values compared | Differences |
| --------------------------------------------------- | ------------------------------------------------ | -------- | --------------- | ----------- |
| `nomborpotro-backup-2026-10-01.anonymised.json`     | 3 of 5 (first term, nasheed, second term)        | 33       | 75              | 3           |
| `nomborpotro-backup-2026-09-01.anonymised.json`     | 0 of 1 (the exam has no fields and no responses) | 0        | 0               | 0           |
| Synthetic probes (`P-probe-rules`, `P-probe-entry`) | 2                                                | 12       | 41              | 5           |
| **Total**                                           | **5 fixtures**                                   | **45**   | **116**         | **8**       |

By value: 43 totals, 16 averages, 16 grades, 39 merit positions, 2 student statuses.

Both backups were put through the same pipeline (`fixtures/munshi-parity/index.json` lists every exam of both and whether it was compared). The September backup holds no marks, so it contributes no comparison; this is a limit of the data, not of the method. The remaining two exams of the October backup (a first-term exam with no fields and an annual exam with fields but no responses) also have no marks.

**Result on real data:** all 43 totals, all 16 grades and all 39 merit positions agree exactly. The only difference in the backups is the definition of the average (D-1), in one exam of three students; their grades still agree.

The probes are invented marks, labelled `synthetic`, with Munshi's answers still produced by Munshi's own code. They exist only to reach rules the backups never reach. They hold no student data.

## 3. Assumptions made to build the comparison

- **A-1 Scheme mapping.** A Munshi grade field maps to a `percentage_bands` scheme: each range becomes a band with `min` = the range's `min`; the lowest range (Munshi: "ফেল" or "রাসিব") is the fail grade; the pass mark is the `min` of the second-lowest range (33 in both exams). The nasheed exam has no grade, so a single band and a 0 pass mark are used and only totals and merit positions are compared.
- **A-2 Ranking policy.** Munshi ranks every student by total, with equal totals sharing a rank (dense) and failed students included. The SMS engine reproduces this with `order: ["total_desc"]`, `ties: "dense"`, `include_failed: true`. This is configuration; the shipped preset `bd-general-gpa5` uses other defaults (see section 5).
- **A-3 Rounding of the average.** Munshi shows averages with `toFixed(2)`. Averages are compared as hundredths of a percent (Munshi's value times 100, rounded). No real average sits on a half-hundredth, so the choice does not change any result.
- **A-4 Marks outside the data.** Munshi treats a blank or text mark as 0 and keeps going; the SMS side is given no mark at all for a blank (so its own missing-marks rule applies).

## 4. Differences

### D-1 Average of a mixed-marks exam (Munshi rule vs SMS rule)

- **Seen in:** `P-2026-10-01-form1` (first-term exam, subjects with full marks 150, 100 and 50), 3 students. Munshi 75.00 vs SMS 71.67; 51.22 vs 49.33; 51.22 vs 49.33.
- **Cause:** with `usePercentage` on, Munshi's average is the mean of each subject's percent. The SMS average is the sum of totals over the sum of full marks (spec `results-engine.md`, totals), so a 150-mark subject weighs three times a 50-mark one. With equal full marks the two are the same (second-term exam, and every probe: 0 differences).
- **Effect:** the grade did not change for these three students (A, পাস, পাস in both). It can change when subjects are very uneven.
- **Resolution (needs a decision):** keep the SMS rule, which is the documented one. Spec question for the Owner and the pilot school: should an exam be able to choose the mean of subject percents? If yes it is a change request on `M2-D1`, not an edit.

### D-2 Grade ranges with gaps (Munshi rule)

- **Seen in:** `P-probe-rules`, students `s101` (average 79.33) and `s108` (average 69.67). Munshi returns an empty grade; SMS returns A and A-.
- **Cause:** Munshi stores grade ranges as whole-number `min` and `max` pairs (A 70 to 79, A+ 80 to 100), so a fractional average between 79 and 80 matches no range. SMS bands are described by `min` only and cannot leave a gap. The real exams have the same gaps (79 to 80, 69 to 70, 59 to 60, 44 to 45, 32 to 33) but no real average fell in one. Overlaps, such as the 65 shared by two ranges in the second-term exam, are resolved by Munshi's list order and by SMS's highest `min`, and agree in the data.
- **Resolution:** none for SMS, which is the more correct behaviour. When importing Munshi grade ranges, convert them by `min` (A-1). Record in the import task (`M2-I1`) that a Munshi average in a gap is a Munshi blank, not an SMS regression.

### D-3 A failed subject does not fail the student in Munshi (SMS rule)

- **Seen in:** `P-probe-rules`, student `s102` (100, 100, 20; average 73.33). Munshi grade A; SMS "ফেল".
- **Cause:** Munshi has no pass or fail per subject; the grade comes from the average only. SMS fails a subject below the pass mark and, in a percentage scheme, fails the student when any counted subject fails (spec `results-engine.md`, percentage scheme).
- **Resolution:** keep the SMS rule. Spec question for the pilot (`M0-O1`): do madrasa results fail a student for one failed subject, or only by average? If only by average, the pass rule needs a switch; that is a change request on `M2-D1`.

### D-4 A blank mark (Munshi rule vs SMS rule)

- **Seen in:** `P-probe-entry`, student `s201` (90, 90, blank). Munshi computes total 180, average 60, grade A-; SMS returns `missing_marks` for that student (scheme `missing: block`).
- **Cause:** Munshi's `num()` turns any blank or text into 0 silently. SMS requires every mark to be entered or marked absent, exempt or withheld, so an unfinished entry cannot be published as a zero.
- **Resolution:** keep the SMS rule (it is deliberate, R-01). When importing Munshi data, a blank must be mapped to `absent` or to `treat_as_absent`, chosen with the school; that belongs to `M2-I1`.

### D-5 A mark above the full marks (Munshi flags, SMS rejects)

- **Seen in:** `P-probe-entry`, student `s202` (120 out of 100). Munshi's `markIssue` flags it as `over`, yet still adds it into the total (220) and grades the student A; SMS returns `mark_out_of_range` and computes nothing for that student.
- **Cause:** both systems detect the problem; they differ in what happens next. The test also checks that the same marks are flagged by both.
- **Resolution:** keep the SMS rule. No action.

## 5. Notes that are not differences

- **Ranking defaults.** Munshi's merit rank is dense, includes failed students and counts only places up to `topN`. The shipped SMS preset ranks with `competition` ties and excludes failed students (`include_failed: false`). With the configuration of A-2 the two agree on all 39 compared positions, including ties (the nasheed exam has six students tied on 23). Spec question for `M0-O1`: which tie rule and which treatment of failed students the pilot school expects.
- **Not compared, because only one side defines it.** Munshi has no outcome (pass, fail, absent), no GPA, no optional subject, no sections and no absent, exempt or withheld marks. The SMS engine has no serial numbers, ordinal names for merit ranks or digit scripts (those are display helpers). Grade-distribution charts and colours in Munshi are display only.
- **Bugs.** No bug was found in either engine. The two apparent bugs seen while building the first fixtures were mine (a units mistake in the mapping), fixed before the numbers above were taken.

## 6. Proposed follow-ups

1. Owner or pilot school: answer the two questions in D-1 and D-3, and the ranking question in section 5.
2. `M2-I1`: convert Munshi grade ranges by `min`, map blanks explicitly (D-2, D-4).
3. Obtain a backup with several exams that carry marks (the September backup has none), ideally including an uneven-marks exam with a grade near a boundary, and rerun the script; the tests pick the new fixtures up through `index.json`.
