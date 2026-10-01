-- M1-P1 step 9: private storage buckets and tenant-scoped policies.
-- Forward-only: never edit this file once applied.
--
-- Layout rule: every object lives under `<institution_id>/...`. The first folder of the object
-- name decides the tenant, so a user can only touch objects under an institution where they hold
-- an allowed role. There are no public buckets; files are served through short-lived signed URLs
-- (see packages/db/src/plat/storage.ts, which caps the lifetime).
--
-- Who may do what (assumptions recorded in docs/reports/M1-P1.md):
--   logos    read: admin, teacher, accountant, guardian, student   write: admin
--   photos   read: admin, teacher, accountant                      write: admin
--   imports  read, write: admin                                    (CSV and Munshi backup files)
--   exports  read: admin, accountant                               write: server code only
-- Guardians and students get photos through signed URLs that server code creates after its own
-- scope check. A platform owner reads only while impersonating (private.has_role) and writes only
-- with write access (private.has_role_write).

-- Buckets: private, with size limits and allowed file types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('logos', 'logos', false, 1048576, array['image/png', 'image/jpeg', 'image/webp']),
  ('photos', 'photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('imports', 'imports', false, 10485760,
   array['text/csv', 'application/json', 'application/vnd.ms-excel', 'text/plain']),
  ('exports', 'exports', false, 26214400,
   array['application/pdf', 'text/csv', 'application/zip',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The institution an object belongs to: its first folder, when that is a uuid; otherwise null
-- (and then every check below is false). `name` is the object path inside the bucket.
create function private.storage_institution(name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
  end;
$$;

comment on function private.storage_institution(text) is
  'The institution id in the first folder of a storage object path, or null. Used by storage policies.';

revoke execute on function private.storage_institution(text) from public;
grant execute on function private.storage_institution(text) to authenticated, service_role;

-- logos ------------------------------------------------------------------------
create policy logos_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (select private.has_role(
    private.storage_institution(name),
    array['institution_admin', 'teacher', 'accountant', 'guardian', 'student'])));
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])))
  with check (bucket_id = 'logos' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));

-- photos -----------------------------------------------------------------------
create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (select private.has_role(
    private.storage_institution(name), array['institution_admin', 'teacher', 'accountant'])));
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));
create policy photos_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])))
  with check (bucket_id = 'photos' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));

-- imports ----------------------------------------------------------------------
create policy imports_select on storage.objects for select to authenticated
  using (bucket_id = 'imports' and (select private.has_role(
    private.storage_institution(name), array['institution_admin'])));
create policy imports_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'imports' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));
create policy imports_update on storage.objects for update to authenticated
  using (bucket_id = 'imports' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])))
  with check (bucket_id = 'imports' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));
create policy imports_delete on storage.objects for delete to authenticated
  using (bucket_id = 'imports' and (select private.has_role_write(
    private.storage_institution(name), array['institution_admin'])));

-- exports: clients read only; files are written by server code (service role bypasses RLS) ----
create policy exports_select on storage.objects for select to authenticated
  using (bucket_id = 'exports' and (select private.has_role(
    private.storage_institution(name), array['institution_admin', 'accountant'])));
