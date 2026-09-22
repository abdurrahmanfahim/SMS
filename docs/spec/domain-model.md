# Domain model v0 (task M0-L1)

Scope: everything needed for M1 and M2. Fees, text alerts and the parent portal are specified in `docs/spec/fees-and-alerts.md` (M3-L1). Agents may add columns that a task needs, but must not rename or remove anything here without a Leader-approved request. Column lists are contracts between workstreams.

## 1. Conventions

- **Tenant table** = has `institution_id uuid not null references institutions(id)`. Every tenant table also has `id uuid primary key default gen_random_uuid()` and `unique (institution_id, id)`. Child tables use composite foreign keys `(institution_id, parent_id) references parent (institution_id, id)` so a row can never point into another tenant. `institution_id` is immutable (trigger).
- Every table: `created_at`, `updated_at` (trigger `set_updated_at`), `created_by`, `updated_by` (uuid null, profile ids).
- Enumerations are `text` plus `check`, not Postgres enums. Soft delete (`deleted_at`) only where listed; RLS hides deleted rows from everyone except institution admins.
- Money: `bigint` in poisha. Marks: `numeric(6,2)`. Calendar dates: `date`. Instants: `timestamptz`, displayed in Asia/Dhaka.
- Phones: `text` in E.164, check `~ '^\+8801[3-9][0-9]{8}$'` for Bangladeshi mobiles.
- Names: `name_bn` and `name_en`, both nullable, check that at least one is non-empty.
- Address (jsonb): `{division, district, upazila, union, village_or_ward, details}`, all strings.
- Rows created offline (`attendance_sessions`, `attendance_records`, `marks`) accept client-generated `id`.
- No national ID or birth-registration number is stored in v1 (data minimisation).

## 2. Tenancy, people, platform (owner: WS-PLAT)

- `institutions` (this is the tenant; no `institution_id`): `id`, `name_bn`, `name_en`, `slug` (unique, `^[a-z0-9-]{3,40}$`), `type` (`school|madrasa|coaching|other`), `status` (`trial|active|suspended`).
- `institution_settings`: `institution_id` (pk, fk), `academic_year_style` (`gregorian|hijri|custom`, default `gregorian`), `weekly_holidays smallint[]` (ISO weekday 1 = Monday to 7 = Sunday, default `{5}`), `use_bangla_digits boolean default true`, `attendance_edit_window_days smallint default 2`, `letterhead jsonb default '{}'` (`logo_path`, `address`, `phones`, `header_lines`, `footer_lines`, `signature_labels`), `default_grade_scheme_id uuid null` (fk added by the exam migrations).
- `profiles` (not tenant): `id` (= `auth.users.id`), `full_name`, `phone_e164` (unique, null), `locale` (default `bn`), `must_change_password boolean default false`.
- `memberships`: `id`, `institution_id`, `profile_id`, `role` (`institution_admin|teacher|accountant|guardian|student`), `status` (`invited|active|suspended`), `username text null` (unique per institution), `invited_by null`; unique `(institution_id, profile_id, role)`.
- `platform_admins` (not tenant): `profile_id` pk.
- `audit_log` (append-only; no update or delete): `id bigint identity`, `institution_id null`, `actor_profile_id null`, `actor_role`, `action`, `entity_type`, `entity_id null`, `before jsonb null`, `after jsonb null`, `meta jsonb default '{}'` (includes `impersonating`), `created_at`.
- `invites` (M1-P2): `id`, `institution_id`, `role`, `token_hash unique`, `target jsonb` (for example `{guardian_id, student_ids}`), `expires_at`, `used_at null`.
- `plans` (not tenant, M1-P3): `id text pk`, `name`, `limits jsonb`. `institution_subscriptions`: `institution_id pk`, `plan_id`, `status` (`trial|active|past_due|cancelled`), `valid_until date null`, `notes`.
- `text_credit_ledger` (append-only, M1-P3): `id bigint identity`, `institution_id`, `delta int`, `reason`, `ref null`, `created_by`, `created_at`. Balance = sum of `delta`.
- `impersonation_sessions` (M1-P3): `id`, `platform_admin_id`, `institution_id`, `reason not null`, `write_access boolean default false`, `started_at`, `expires_at` (at most 60 minutes), `ended_at null`.
- `import_jobs`: `id`, `institution_id`, `kind` (`students_csv|munshi_backup`), `status` (`uploaded|validated|committed|failed`), `file_path`, `summary jsonb`, `created_by`.

## 3. Academic structure (owner: WS-ACAD)

- `academic_years`: `id`, `institution_id`, `name_bn`, `name_en`, `calendar` (`gregorian|hijri`), `starts_on`, `ends_on`, `is_current`. One current year per institution (partial unique index); no overlapping ranges (exclusion constraint); `ends_on > starts_on`.
- `class_levels`: `id`, `institution_id`, `name_bn`, `name_en`, `sort_order int`, `category` (`school|madrasa|coaching|other`, null). Unique `(institution_id, name_bn)`. Data, not enum.
- `sections` (a class level in one year): `id`, `institution_id`, `academic_year_id`, `class_level_id`, `name`, `shift null`, `class_teacher_membership_id null`, `capacity null`. Unique `(institution_id, academic_year_id, class_level_id, name)`.
- `subjects`: `id`, `institution_id`, `name_bn`, `name_en`, `code null`. Unique `(institution_id, name_bn)`.
- `class_subjects`: `id`, `institution_id`, `academic_year_id`, `class_level_id`, `subject_id`, `is_optional boolean default false`, `sort_order`. Unique per `(institution_id, academic_year_id, class_level_id, subject_id)`.
- `teacher_assignments`: `id`, `institution_id`, `academic_year_id`, `membership_id`, `section_id`, `subject_id null` (null means class teacher), `role` (`subject_teacher|class_teacher`).

## 4. Students (owner: WS-ACAD)

- `students`: `id`, `institution_id`, `student_code` (unique per institution), `name_bn`, `name_en`, `gender` (`male|female|other`, null), `date_of_birth null`, `phone_e164 null`, `address jsonb null`, `photo_path null`, `admission_date null`, `status` (`active|left|graduated|transferred`), `status_reason null`, `deleted_at null`.
- `guardians`: `id`, `institution_id`, `name_bn`, `name_en`, `phone_e164 null`, `alt_phone_e164 null`, `occupation null`, `address jsonb null`, `profile_id null` (set when the guardian accepts an invite), `deleted_at null`.
- `student_guardians`: `institution_id`, `student_id`, `guardian_id`, `relation` (`father|mother|other`), `is_primary`, `receive_alerts default true`. Pk `(student_id, guardian_id)`.
- `enrollments`: `id`, `institution_id`, `student_id`, `academic_year_id`, `section_id`, `roll int null`, `status` (`enrolled|promoted|held|left`), `joined_on null`, `left_on null`. Unique `(institution_id, student_id, academic_year_id)`; unique `(institution_id, section_id, roll)` where `roll is not null`.
- `enrollment_subjects`: `institution_id`, `enrollment_id`, `class_subject_id`, `is_chosen_optional default false`. Pk `(enrollment_id, class_subject_id)`.

## 5. Attendance (owner: WS-ACAD)

- `attendance_sessions`: `id`, `institution_id`, `section_id`, `date`, `period smallint null` (null = daily), `taken_by_membership_id`, `finalized_at null`. Unique `(institution_id, section_id, date, coalesce(period, 0))`.
- `attendance_records`: `id`, `institution_id`, `session_id`, `enrollment_id`, `status` (`present|absent|late|leave`), `note null`. Unique `(session_id, enrollment_id)`.

## 6. Exams and results (owner: WS-EXAM)

- `grade_schemes`: `id`, `institution_id`, `name`, `preset_key null`, `config jsonb` (validated by a schema in `@sms/domain`), `version int default 1`. System presets are code constants in `@sms/domain`, copied into rows.
- `exams`: `id`, `institution_id`, `academic_year_id`, `name_bn`, `name_en`, `kind` (`term|class_test|model_test|other`), `grade_scheme_id`, `starts_on null`, `ends_on null`, `status` (`draft|marks_open|marks_locked|published|archived`), `sort_order`.
- `exam_classes`: `institution_id`, `exam_id`, `class_level_id`. Pk `(exam_id, class_level_id)`.
- `exam_subjects`: `id`, `institution_id`, `exam_id`, `class_level_id`, `class_subject_id`, `full_marks`, `pass_marks null`, `counts_in_total default true`, `pass_rule jsonb null` (overrides the scheme default, see `results-engine.md`), `sort_order`. Unique `(exam_id, class_subject_id)`.
- `exam_components`: `id`, `institution_id`, `exam_subject_id`, `paper smallint default 1` (1st or 2nd paper), `code` (`total|written|mcq|practical|ct|other`), `name_bn`, `full_marks`, `pass_marks null`, `convert_to numeric null`, `sort_order`. Every exam subject has at least one component; component full marks sum to the subject's full marks.
- `marks`: `id`, `institution_id`, `exam_component_id`, `enrollment_id`, `value numeric(6,2) null`, `mark_code` (`absent|exempt|withheld`, null), `entered_by_membership_id`. Exactly one of `value` and `mark_code` is set; a missing row means not entered. Unique `(exam_component_id, enrollment_id)`. Writes are allowed only while the exam is `marks_open` (enforced in the database).
- `result_snapshots` (immutable except `status`): `id`, `institution_id`, `exam_id`, `class_level_id`, `version int`, `status` (`published|superseded|revoked`), `rules jsonb` (grade scheme and rule set frozen at publish), `published_at`, `published_by_membership_id`, `checksum`. Unique `(exam_id, class_level_id, version)`.
- `result_rows` (immutable): `id`, `institution_id`, `snapshot_id`, `enrollment_id`, `student jsonb` (name, roll, section, code at publish time), `subjects jsonb` (per subject: component marks, total, grade, point, passed), `totals jsonb` (total, average, gpa, grade, `outcome` = `passed|failed|withheld`, `failed_count`), `rank_class int null`, `rank_section int null`. Unique `(snapshot_id, enrollment_id)`.

## 7. Notices (owner: WS-COMM, M2-C1)

- `notices`: `id`, `institution_id`, `title`, `body`, `status` (`draft|published`), `published_at null`, `expires_on null`, `created_by_membership_id`.
- `notice_audiences`: `institution_id`, `notice_id`, `kind` (`all|role|class_level|section`), `ref_id uuid null`, `role null`. A notice without audience rows is visible only to admins.

## 8. Table ownership and package rules

| Workstream | Owns tables |
|---|---|
| PLAT | sections 2 (tenancy, people, platform, audit, invites, import_jobs) |
| ACAD | sections 3, 4, 5 |
| EXAM | section 6 |
| COMM | section 7 and the alert tables in `fees-and-alerts.md` |
| FIN | the fee tables in `fees-and-alerts.md` |

Import rules: `@sms/domain` imports only `zod` (no React, no Supabase, no I/O). `@sms/db` imports supabase-js and generated types only. `@sms/ui` imports React, Radix and styling utilities, never domain or db. `apps/web` may import all packages, but a feature must not import another feature; shared needs go to `apps/web/src/shared/` or a package. Edge Functions may import `@sms/domain`.
