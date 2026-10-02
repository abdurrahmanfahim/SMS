-- M1-A1 step 4: attach the generic row-audit trigger (private.audit_row_change, M1-P1) to
-- every academic structure table, so every change by an admin, or by a platform owner inside an
-- impersonation session, writes an audit_log row. These tables are low-volume configuration, so
-- auditing them is cheap. Forward-only: never edit this file once applied.
create trigger audit_row_change after insert or update or delete on public.academic_years
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.class_levels
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.sections
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.subjects
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.class_subjects
  for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.teacher_assignments
  for each row execute function private.audit_row_change();
