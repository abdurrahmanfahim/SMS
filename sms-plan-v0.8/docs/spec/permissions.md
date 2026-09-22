# Permissions and RLS patterns v0 (task M0-L1)

## 1. Roles

`platform_owner` (row in `platform_admins`), `institution_admin`, `teacher`, `accountant`, `guardian`, `student`. Roles live in `memberships` and apply per institution. A person can hold several memberships.

## 2. Matrix

`F` full · `R` read · `R*` read, scoped · `W*` write, scoped · `—` none. Scopes are explained below the table.

| Resource | Platform owner | Institution admin | Teacher | Accountant | Guardian | Student |
|---|---|---|---|---|---|---|
| institutions, settings | F (audited) | R, update settings | R | R | R (name) | R (name) |
| memberships, profiles, invites | R (audited) | F | R own | R own | R own | R own |
| academic structure | R (audited) | F | R | R | R* | R |
| students, guardians, enrollments | R (audited) | F | R* (assigned sections) | R | R* (own children) | R* (self) |
| attendance | R (audited) | F | W* (assigned sections, within the edit window) | — | R* (own children) | R* (self) |
| exams setup, grade schemes | R (audited) | F | R* (own subjects) | — | — | — |
| marks | R (audited) | F | W* (own subjects, only while exam is `marks_open`) | — | — | — |
| result snapshots and rows | R (audited) | F (publish, revoke) | R* (own classes, published) | — | R* (own children, published) | R* (self, published) |
| notices | R (audited) | F | W* (own sections), R | R | R* (audience) | R* (audience) |
| import_jobs | R (audited) | F | — | — | — | — |
| fee structure, invoices, payments, locks (M3) | R (audited) | F | — | F | R* (own children, invoices and receipts) | — |
| text templates, outbox (M3) | R (audited) | F | — | R (outbox) | — | — |
| credit ledger (M3) | F | R | — | — | — | — |
| audit_log | R | R (own institution) | — | — | — | — |
| platform tables (plans, subscriptions, credits, impersonation) | F | — | — | — | — | — |

Scopes:
- **Assigned sections and own subjects:** through `teacher_assignments` (a null `subject_id` means class teacher, who sees the whole section).
- **Edit window:** teachers may edit attendance for today and the previous `attendance_edit_window_days` days; admins may edit any date.
- **Own children:** through `student_guardians` and `guardians.profile_id`.
- **Audited:** every platform-owner access to tenant data goes through an impersonation session (read-only unless `write_access`), and each action writes `audit_log` with `meta.impersonating = true`.

## 3. Helper functions (schema `private`, not exposed by the API)

All are `SECURITY DEFINER`, `STABLE`, with `set search_path = ''`. Policies call them wrapped as `(select private.fn(...))` so Postgres evaluates them once per statement.

- `private.uid()`: the current user id.
- `private.is_platform_admin()`.
- `private.has_role(inst uuid, roles text[])`: an active membership with one of the roles, or a platform owner with an active impersonation session for `inst` (read only unless the session has `write_access`).
- `private.is_teacher_of_section(inst uuid, section uuid)` and `private.teaches(inst uuid, section uuid, subject uuid)`.
- `private.guardian_of_student(inst uuid, student uuid)` and `private.is_student_self(inst uuid, student uuid)`.

## 4. Policy rules

1. RLS is enabled on every table in `public`; the default is deny.
2. `insert` and `update` policies carry a `with check` that mirrors `using`. `delete` is admin-only, and most tables use soft delete or status changes instead.
3. `service_role` bypasses RLS, so it is used only in server code (Edge Functions, CI) and never reaches the client bundle.
4. Append-only tables (`audit_log`, `text_credit_ledger`) have no update or delete privileges and a trigger that blocks them.
5. Published results are immutable: no update except `status` on `result_snapshots`.

## 5. Policy template (illustrative; agents write and test the real ones)

```sql
create policy students_select on public.students for select to authenticated
using (
  deleted_at is null and (
    (select private.has_role(institution_id, array['institution_admin','accountant']))
    or exists (select 1 from public.enrollments e
               where e.student_id = students.id
                 and (select private.is_teacher_of_section(e.institution_id, e.section_id)))
    or (select private.guardian_of_student(institution_id, id))
    or (select private.is_student_self(institution_id, id))
  )
  or (select private.has_role(institution_id, array['institution_admin']))
);
```

## 6. Test rule

Every policy has tests for: the allowed role passes, another role fails, another tenant fails. M1-P1 provides `supabase/tests/helpers.sql` (creates two institutions with one user per role); M1-Q1 keeps `supabase/tests/rls-registry.json`, and CI fails when a table in `public` is missing from it.
