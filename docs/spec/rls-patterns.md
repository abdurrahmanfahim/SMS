# RLS patterns: how to add a table safely (task M1-P1)

Read this before you add any table to `public`. It is the practical companion to `docs/spec/permissions.md` (who may do what) and `docs/spec/domain-model.md` (which columns exist). If this file and `permissions.md` disagree, `permissions.md` wins; write the difference under "Requests" in your report.

Everything here is built and tested in migrations `202610010300` to `202610010350` and in `supabase/tests/`.

## 1. The checklist (a table is not done until every box is ticked)

1. **Columns.** `id uuid primary key default gen_random_uuid()`, `institution_id uuid not null references public.institutions (id) on delete cascade`, `unique (institution_id, id)`, `created_at`, `updated_at`, `created_by`, `updated_by` (section 2).
2. **Composite foreign keys** to other tenant tables: `foreign key (institution_id, parent_id) references public.parent (institution_id, id)`. Never a plain `parent_id` foreign key, so a row can never point into another tenant. A client-supplied `institution_id` is never trusted: the policy checks it (section 4).
3. **Triggers:** `set_updated_at` and `forbid_institution_id_change` (section 2), plus `audit_row_change` when the table's changes must be traceable (section 6).
4. **Enable RLS and set privileges.** `alter table ... enable row level security;` then `revoke all ... from anon, authenticated;` and grant back only what the matrix allows (section 3). Supabase grants new tables to `anon` and `authenticated` by default; the `revoke` is what makes "deny by default" true.
5. **Policies** for each of select, insert, update, delete, written with the helpers (section 4). `insert` and `update` carry `with check`. Use `private.has_role` for reading and `private.has_role_write` for writing.
6. **Tests** in `supabase/tests/<workstream>/NNN_<table>_rls.test.sql` for: the allowed role passes, another role fails, another tenant fails, anon fails (section 5).
7. **Migration file** named `YYYYMMDDHHMM_<ws>_<desc>.sql`, forward-only, never edited after it has been applied. Then run `pnpm db:reset && pnpm db:test && pnpm db:types` and commit `packages/db/src/types.ts`.
8. **Registry.** From M1-Q1 on, add the table to `supabase/tests/rls-registry.json`; CI fails when a table in `public` is missing from it.

`private.tables_without_rls()` and `supabase/tests/plat/000_rls_enabled.test.sql` already fail the build if you forget step 4.

## 2. Table template (copy and rename)

```sql
create table public.example_items (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  parent_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint example_items_tenant_id_unique unique (institution_id, id),
  constraint example_items_parent_fk
    foreign key (institution_id, parent_id) references public.example_parents (institution_id, id)
);

create trigger set_updated_at before update on public.example_items
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.example_items
  for each row execute function private.forbid_institution_id_change();
create trigger audit_row_change after insert or update or delete on public.example_items
  for each row execute function private.audit_row_change();   -- optional, see section 6
```

Rules that go with it (from `domain-model.md` section 1): enumerations are `text` plus `check`, money is `bigint` poisha, calendar dates are `date`, instants are `timestamptz`, phones are E.164 text, and soft delete (`deleted_at`) only where the domain model lists it.

## 3. Enable RLS and set privileges

```sql
alter table public.example_items enable row level security;

revoke all on public.example_items from public, anon, authenticated;
grant select, insert, update, delete on public.example_items to authenticated;   -- only what the matrix allows
grant select, insert, update, delete on public.example_items to service_role;    -- server code
```

Grant only the verbs that some role really has; a verb with no policy is denied anyway, but not granting it gives a clear `42501 permission denied` instead of a silent empty result. Never grant anything to `anon` unless a task says a table is public (none is in v1).

## 4. Policies

The helpers live in schema `private`, are `SECURITY DEFINER` with an empty search path, and are called wrapped in `(select ...)` so Postgres evaluates them once per statement, not once per row.

| Helper                                                  | Meaning                                                                                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `private.uid()`                                         | the signed-in user id, or null                                                                                                            |
| `private.is_platform_admin()`                           | the caller has a row in `platform_admins`                                                                                                 |
| `private.has_role(inst, roles[])`                       | **read check.** An active membership with one of the roles in `inst`, or a platform owner with an active impersonation session for `inst` |
| `private.has_role_write(inst, roles[])`                 | **write check.** Like `has_role`, but an impersonating platform owner passes only when the session has `write_access`                     |
| `private.impersonating(inst, need_write default false)` | the caller is a platform owner with an active session for `inst`                                                                          |
| `private.is_teacher_of_section(inst, section)`          | active teacher with any assignment in the section (a null subject means class teacher)                                                    |
| `private.teaches(inst, section, subject)`               | active teacher assigned to exactly this subject in this section                                                                           |
| `private.guardian_of_student(inst, student)`            | active guardian linked to the student                                                                                                     |
| `private.is_student_self(inst, student)`                | active student whose `students.profile_id` is the caller                                                                                  |

Memberships that are `invited` or `suspended` grant nothing. The four last helpers return `false` while the ACAD tables they read do not exist yet, and start working on their own once those tables exist. They never raise.

### 4.1 Admin-only table (read and write)

```sql
create policy example_items_select on public.example_items for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin'])));
create policy example_items_insert on public.example_items for insert to authenticated
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy example_items_update on public.example_items for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));
create policy example_items_delete on public.example_items for delete to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])));
```

`with check` mirrors `using`. Because the check names `institution_id` of the new row, a client that sends another tenant's `institution_id` is refused.

### 4.2 Several roles read, admin writes

Change only the select policy: `array['institution_admin', 'teacher', 'accountant']`. Keep the write policies admin-only.

### 4.3 Scoped read (teacher by section, guardian by child, student self)

```sql
create policy example_items_select on public.example_items for select to authenticated
using (
  (select private.has_role(institution_id, array['institution_admin', 'accountant']))
  or (select private.is_teacher_of_section(institution_id, section_id))
  or (select private.guardian_of_student(institution_id, student_id))
  or (select private.is_student_self(institution_id, student_id))
);
```

Include only the lines the matrix grants for this table. For "own subjects" use `private.teaches(institution_id, section_id, subject_id)`.

### 4.4 Soft-deleted rows

Admins see deleted rows, everyone else does not:

```sql
using (
  (deleted_at is null and (select private.has_role(institution_id, array['teacher'])))
  or (select private.has_role(institution_id, array['institution_admin']))
)
```

### 4.5 Rows created offline

`attendance_sessions`, `attendance_records` and `marks` accept a client-generated `id` (domain model section 1). That is safe because the policy, not the id, decides access; keep the composite foreign keys and the `institution_id` check in `with check`.

### 4.6 Things never to do

- Never read `institution_id` from the request or a JWT claim. It comes from the row.
- Never use `auth.uid()` or `auth.jwt()` directly in a policy; use the helpers.
- Never query another tenant table inside a policy without `institution_id` in the join; prefer a helper.
- Never put the service-role key anywhere but server code and CI secrets.
- Never create a `SECURITY DEFINER` function without `set search_path = ''`, schema-qualified names, and a role and tenant check inside.

## 5. Tests

`supabase/tests/helpers.sql` is installed first by `supabase test db`. It creates the schema `tests` (holding no data) and a fixture of **two institutions, `a` and `b`, each with one active user per role**, plus a platform owner and an outsider with no membership.

```sql
select tests.create_fixture();               -- once per test transaction, as the owner role
select tests.act_as('a', 'teacher');         -- act as institution A's teacher (RLS applies from here)
select tests.act_as('platform', 'platform_owner');
select tests.act_as('none', 'outsider');
select tests.act_as_anon();                  -- the anon role
select tests.act_as_service();               -- the service role (bypasses RLS)
select tests.reset();                        -- back to the owner role, no signed-in user
select tests.count_as('a', 'teacher', 'select 1 from public.example_items');   -- rows visible to that user, then reset
select tests.inst('a');                      -- institution A's uuid (deterministic; also 'b')
select tests.user_id('a', 'teacher');        -- that user's uuid
```

`which` is `'a'` or `'b'`; `role` is one of `institution_admin`, `teacher`, `accountant`, `guardian`, `student`, or the specials `('platform', 'platform_owner')` and `('none', 'outsider')`.

Template (every table gets at least this matrix; replace each `...` with the uuid of a parent row you seeded for that institution):

```sql
begin;
select plan(7);   -- the number of assertions below; pgTAP fails the file when it differs
select tests.create_fixture();

-- seed rows as the owner role
insert into public.example_items (institution_id, parent_id, name) values (tests.inst('a'), ..., 'A item'), (tests.inst('b'), ..., 'B item');

-- allowed role passes
select is(tests.count_as('a', 'institution_admin', 'select 1 from public.example_items'), 1::bigint, 'admin A reads only A rows');
-- other role fails
select is(tests.count_as('a', 'guardian', 'select 1 from public.example_items'), 0::bigint, 'guardian A reads nothing');
-- other tenant fails (read)
select is(tests.count_as('b', 'institution_admin', format('select 1 from public.example_items where institution_id = %L', tests.inst('a'))), 0::bigint, 'admin B cannot read A rows');
-- anon fails
select tests.act_as_anon();
select throws_ok($$select * from public.example_items$$, '42501', null, 'anon cannot read');
select tests.reset();

-- write: allowed role passes, other tenant fails, other role fails
select tests.act_as('a', 'institution_admin');
select lives_ok(format($$insert into public.example_items (institution_id, parent_id, name) values (%L, %L, 'new')$$, tests.inst('a'), ...), 'admin A inserts into A');
select throws_ok(format($$insert into public.example_items (institution_id, parent_id, name) values (%L, %L, 'forged')$$, tests.inst('b'), ...), '42501', null, 'admin A cannot insert into B');
select tests.reset();
select tests.act_as('a', 'teacher');
select throws_ok(format($$insert into public.example_items (institution_id, parent_id, name) values (%L, %L, 'x')$$, tests.inst('a'), ...), '42501', null, 'teacher A cannot insert');
select tests.reset();

select * from finish();
rollback;
```

Notes that save time:

- A denied `select` returns **zero rows**; a denied `insert` raises `42501`; a denied `update` or `delete` changes **zero rows** (check with a follow-up `select` as the owner role) unless the privilege itself is missing, which raises `42501`.
- Run a fixture insert as the owner role (before `act_as`) so RLS does not get in the way of seeding.
- Test the cross-tenant case for **every** verb, and test an `update` that tries to change `institution_id` (the trigger raises `23514`).
- For tables that audit, assert the `audit_log` rows (section 6).

## 6. Auditing

```sql
create trigger audit_row_change after insert or update or delete on public.example_items
  for each row execute function private.audit_row_change();
-- keep a sensitive column out of the log:  execute function private.audit_row_change('token_hash');
```

It writes one `audit_log` row per change with `action` (`insert|update|delete`), `entity_type` (the table name), `entity_id` (the row's `id`), `before`, `after`, the actor and the actor's role in that institution, and `meta.impersonating`. Actors are: `system` (no signed-in user, so server code), the most senior active membership role, or `platform_owner` (inside an impersonation session, with `meta.impersonating = true`). A signed-in user with no role in the institution is recorded as `system` with `meta.actor_role_unresolved = true`.

Which tables to audit: tenancy and permission tables always (done for `institutions`, `institution_settings`, `memberships`, `platform_admins`); money, published results, attendance edits and imports, in the tasks that own them. Do not audit high-volume rows with no accountability need.

`audit_log` itself is append-only: no update, delete or truncate privilege for any API role, a trigger that also stops the owner role, and no client insert. Clients cannot write it; the trigger function and server code do.

## 7. Storage (private buckets)

Buckets `logos`, `photos`, `imports`, `exports` are private. Every object path starts with the institution id:

```ts
import { storagePath, createSignedUrl } from "@sms/db";
const path = storagePath(institutionId, "students", `${studentId}.jpg`); // "<institution_id>/students/<id>.jpg"
const signed = await createSignedUrl(client, "photos", path, 60); // seconds, capped at 300
```

| Bucket    | Read                                          | Write            | Limit                    |
| --------- | --------------------------------------------- | ---------------- | ------------------------ |
| `logos`   | admin, teacher, accountant, guardian, student | admin            | 1 MiB, png/jpeg/webp     |
| `photos`  | admin, teacher, accountant                    | admin            | 2 MiB, jpeg/png/webp     |
| `imports` | admin                                         | admin            | 10 MiB, csv/json/text    |
| `exports` | admin, accountant                             | server code only | 25 MiB, pdf/csv/zip/xlsx |

Policies use `private.storage_institution(name)` (the first folder, when it is a uuid) with the same helpers as tables. An object outside an institution folder is unreachable for every client. Guardians and students receive photo URLs only from server code, which checks their scope and then creates a signed URL with the service role. To add a bucket: add it in a migration with `public = false`, a size limit and allowed types; add four policies like the ones in `202610010350_plat_storage.sql`; add a test file like `050_storage_rls.test.sql`.

## 8. Things that look fine but are not

- Granting `select` and trusting a `where institution_id = ...` in the app: the app filter is not security. Only the policy is.
- A policy that calls a helper without `(select ...)`: correct but slow on large tables.
- A foreign key from a tenant table to `institutions (id)` only, without the composite key to its parent: the parent can belong to another tenant.
- `update ... set institution_id = ...` to "move" a row: blocked by `forbid_institution_id_change`; keep that trigger on every tenant table.
- Putting a table in `private`: nothing in `private` is exposed through the API; product tables belong in `public`.
