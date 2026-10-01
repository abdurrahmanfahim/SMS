-- M1-P1 step 3: policies for institution_settings, platform_admins and audit_log, per the matrix
-- in docs/spec/permissions.md section 2, using the helpers from the previous migration.
-- Forward-only: never edit this file once applied.
--
-- Not in this migration, on purpose: policies that let institution admins read or manage
-- `memberships` and `profiles` (matrix row "memberships, profiles, invites") belong to the
-- invite and member-management work in M1-P2; the M0-P3 policies (read your own rows) stay.

-- institution_settings -------------------------------------------------------
-- Read: admin, teacher and accountant of the institution (a platform owner only while impersonating).
-- Guardians and students see the institution name through `institutions`, not the settings.
create policy institution_settings_select on public.institution_settings
  for select to authenticated
  using ((select private.has_role(institution_id, array['institution_admin', 'teacher', 'accountant'])));

-- Update: institution admin only. Rows are created by a trigger on institutions and never
-- deleted by clients (no insert or delete policy, and no such privilege for authenticated).
create policy institution_settings_update on public.institution_settings
  for update to authenticated
  using ((select private.has_role_write(institution_id, array['institution_admin'])))
  with check ((select private.has_role_write(institution_id, array['institution_admin'])));

-- platform_admins ------------------------------------------------------------
-- A signed-in user may read their own row (so a client can tell whether it is a platform owner).
-- Nobody writes through the API; rows are managed by server code with the service role.
create policy platform_admins_select_own on public.platform_admins
  for select to authenticated
  using (profile_id = (select private.uid()));

-- audit_log ------------------------------------------------------------------
-- Platform owners read everything; an institution admin reads their own institution's rows.
-- Rows with no institution (institution_id null) are platform-level and platform-owner only.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (
    (select private.is_platform_admin())
    or (
      institution_id is not null
      and (select private.has_role(institution_id, array['institution_admin']))
    )
  );
