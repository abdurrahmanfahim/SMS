-- apply_ops(p_ops jsonb) -> jsonb {results: ApplyOpResult[]}
--
-- Applies a batch of client-queued writes (see src/types.ts's OutboxOp) in one call.
-- Contract (documented in full in docs/research/offline-spike.md):
--   * Idempotent by op_id: re-delivering the same op_id (client retry, or a duplicate
--     network delivery) never re-applies the write -- it returns the ORIGINAL result again,
--     with duplicate:true.
--   * attendance and marks are both last-write-wins per their natural key
--     (institution_id, student_id, date) and (institution_id, component_id, student_id) --
--     "last" meaning last to reach this function, not last by client clock (client clocks
--     are not trusted; see docs/research/offline-spike.md's Conflict policy section).
--   * A write to a finalised attendance day or a locked exam component is rejected with a
--     typed reason ("attendance_finalised" / "exam_locked"), not applied and not retried
--     server-side -- the client outbox treats "rejected" as terminal, not transient.
--   * Every applied marks write also gets an append-only marks_audit row.
--
-- p_ops is a jsonb ARRAY of objects shaped like OutboxOp (camelCase keys, matching the
-- client's own JSON, so the server needs no field renaming): [{opId, entity, payload}, ...]
-- (createdAt/attempts/status/nextRetryAt are client-only bookkeeping and are ignored here.)
create or replace function apply_ops(p_ops jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_op jsonb;
  v_op_id uuid;
  v_entity text;
  v_payload jsonb;
  -- Single-tenant for this spike: a real implementation must derive this from the
  -- authenticated session (e.g. auth.jwt() claims), never trust a client-supplied value --
  -- see docs/research/offline-spike.md, "What this spike does not prove".
  v_institution_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_existing jsonb;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_student_id uuid;
  v_date date;
  v_att_status text;
  v_component_id uuid;
  v_value numeric;
begin
  for v_op in select * from jsonb_array_elements(p_ops)
  loop
    v_op_id := (v_op ->> 'opId')::uuid;
    v_entity := v_op ->> 'entity';
    v_payload := v_op -> 'payload';

    select result into v_existing from applied_ops where op_id = v_op_id;
    if v_existing is not null then
      v_results := v_results || jsonb_build_array(v_existing || jsonb_build_object('duplicate', true));
      continue;
    end if;

    if v_entity = 'attendance' then
      v_student_id := (v_payload ->> 'studentId')::uuid;
      v_date := (v_payload ->> 'date')::date;
      v_att_status := v_payload ->> 'status';

      if exists (
        select 1 from attendance_locks al
        where al.institution_id = v_institution_id and al.date = v_date
      ) then
        v_result := jsonb_build_object(
          'opId', v_op_id, 'status', 'rejected', 'reason', 'attendance_finalised'
        );
      else
        insert into attendance (institution_id, student_id, date, status, updated_at, op_id)
        values (v_institution_id, v_student_id, v_date, v_att_status, now(), v_op_id)
        on conflict (institution_id, student_id, date)
        do update set status = excluded.status, updated_at = excluded.updated_at, op_id = excluded.op_id;

        v_result := jsonb_build_object('opId', v_op_id, 'status', 'applied');
      end if;

    elsif v_entity = 'marks' then
      v_student_id := (v_payload ->> 'studentId')::uuid;
      v_component_id := (v_payload ->> 'componentId')::uuid;
      v_value := (v_payload ->> 'value')::numeric;

      if exists (
        select 1 from exam_locks el
        where el.institution_id = v_institution_id and el.component_id = v_component_id
      ) then
        v_result := jsonb_build_object(
          'opId', v_op_id, 'status', 'rejected', 'reason', 'exam_locked'
        );
      else
        insert into marks (institution_id, component_id, student_id, value, updated_at, op_id)
        values (v_institution_id, v_component_id, v_student_id, v_value, now(), v_op_id)
        on conflict (institution_id, component_id, student_id)
        do update set value = excluded.value, updated_at = excluded.updated_at, op_id = excluded.op_id;

        insert into marks_audit (institution_id, component_id, student_id, value, op_id, applied_at)
        values (v_institution_id, v_component_id, v_student_id, v_value, v_op_id, now());

        v_result := jsonb_build_object('opId', v_op_id, 'status', 'applied');
      end if;

    else
      v_result := jsonb_build_object('opId', v_op_id, 'status', 'rejected', 'reason', 'unknown_entity');
    end if;

    v_result := v_result || jsonb_build_object('duplicate', false);
    insert into applied_ops (op_id, entity, result, applied_at) values (v_op_id, v_entity, v_result, now());
    v_results := v_results || jsonb_build_array(v_result);
  end loop;

  return jsonb_build_object('results', v_results);
end;
$$;
