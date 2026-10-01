-- M1-P1 step 5: the trigger that makes institution_id immutable, as a documented reusable
-- function. The function itself, private.forbid_institution_id_change(), was created with the
-- tenancy tables (M0-P3) and is already attached to memberships and institution_settings; this
-- migration documents it as the shared contract and closes it to direct calls.
-- Forward-only: never edit this file once applied.
--
-- Attach it to every tenant table:
--   create trigger forbid_institution_id_change before update on public.<table>
--     for each row execute function private.forbid_institution_id_change();
comment on function private.forbid_institution_id_change() is
  'BEFORE UPDATE ... FOR EACH ROW trigger: raises (23514) when institution_id changes. Attach to '
  'every tenant table (see docs/spec/rls-patterns.md). Contract used by all workstreams.';

revoke execute on function private.forbid_institution_id_change() from public;
