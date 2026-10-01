-- M1-P1 step 4: the generic row-audit trigger function every workstream attaches to its
-- tables, and its first uses. Forward-only: never edit this file once applied.
--
-- Attach it like this (AFTER, FOR EACH ROW, all three operations):
--   create trigger audit_row_change after insert or update or delete on public.<table>
--     for each row execute function private.audit_row_change();
-- To keep a sensitive column out of the log, pass its name as an argument; it is removed from
-- both `before` and `after`:
--   ... execute function private.audit_row_change('token_hash');
create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  -- tg_argv is null (not empty) when the trigger has no arguments
  excluded text[] := coalesce(tg_argv, array[]::text[]);
  new_j jsonb;
  old_j jsonb;
  row_j jsonb;
  inst uuid;
  ent uuid;
  who text;
  acting boolean := false;
  unresolved boolean := false;
begin
  if tg_when <> 'AFTER' or tg_level <> 'ROW' then
    raise exception 'private.audit_row_change must be an AFTER ... FOR EACH ROW trigger';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_j := to_jsonb(new);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    old_j := to_jsonb(old);
  end if;
  row_j := coalesce(new_j, old_j);

  -- Institution: the row's own institution_id; for `institutions` itself, its id.
  if tg_table_schema = 'public' and tg_table_name = 'institutions' then
    inst := (row_j ->> 'id')::uuid;
  else
    inst := (row_j ->> 'institution_id')::uuid;
  end if;
  -- Entity id: the row's `id` when it is a uuid (tables with another key leave it null).
  if (row_j ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    ent := (row_j ->> 'id')::uuid;
  end if;

  -- Actor role: server code (no signed-in user) is `system`; a platform owner inside an
  -- impersonation session is `platform_owner` and the entry says so; otherwise the caller's
  -- most senior active role in the institution.
  if uid is null then
    who := 'system';
  else
    acting := inst is not null and private.impersonating(inst, false);
    if acting then
      who := 'platform_owner';
    else
      select m.role into who
      from public.memberships m
      where m.institution_id = inst and m.profile_id = uid and m.status = 'active'
      order by array_position(
        array['institution_admin', 'accountant', 'teacher', 'guardian', 'student'], m.role
      )
      limit 1;
      if who is null and private.is_platform_admin() then
        who := 'platform_owner';
      end if;
      if who is null then
        who := 'system';
        unresolved := true;
      end if;
    end if;
  end if;

  insert into public.audit_log (
    institution_id, actor_profile_id, actor_role, action, entity_type, entity_id,
    before, after, meta
  )
  values (
    inst, uid, who, lower(tg_op), tg_table_name, ent,
    old_j - excluded, new_j - excluded,
    jsonb_build_object('impersonating', acting)
      || case when unresolved then jsonb_build_object('actor_role_unresolved', true) else '{}'::jsonb end
  );
  return null;
end;
$$;

comment on function private.audit_row_change() is
  'Generic AFTER ... FOR EACH ROW audit trigger: writes one audit_log row per insert, update or '
  'delete with before and after images, the actor and the actor role. Trigger arguments name '
  'columns to leave out of the images. Attach it to every table whose changes must be traceable.';

revoke execute on function private.audit_row_change() from public;

-- First uses: the tenancy tables whose changes matter most.
create trigger audit_row_change after insert or update or delete on public.memberships
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.institutions
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.institution_settings
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.platform_admins
  for each row execute function private.audit_row_change();
