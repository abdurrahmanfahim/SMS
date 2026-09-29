-- Minimal schema to exercise apply_ops(). This is NOT a proposed production migration --
-- it deliberately skips multi-tenant RLS (see docs/research/offline-spike.md, "What this
-- spike does not prove") so it can run standalone against an embedded Postgres (pglite)
-- inside this spike, without touching supabase/migrations/.

create table if not exists attendance (
  institution_id uuid not null,
  student_id uuid not null,
  date date not null,
  status text not null,
  updated_at timestamptz not null,
  op_id uuid not null,
  primary key (institution_id, student_id, date)
);

-- Presence of a row here means that institution's attendance for that date is finalised
-- (locked from further edits) -- e.g. an admin closed the day.
create table if not exists attendance_locks (
  institution_id uuid not null,
  date date not null,
  primary key (institution_id, date)
);

create table if not exists marks (
  institution_id uuid not null,
  component_id uuid not null,
  student_id uuid not null,
  value numeric(6, 2) not null,
  updated_at timestamptz not null,
  op_id uuid not null,
  primary key (institution_id, component_id, student_id)
);

-- Append-only history of every applied marks write (Step 3's "audit row" requirement).
create table if not exists marks_audit (
  id bigserial primary key,
  institution_id uuid not null,
  component_id uuid not null,
  student_id uuid not null,
  value numeric(6, 2) not null,
  op_id uuid not null,
  applied_at timestamptz not null
);

-- Presence of a row here means that exam component is locked (published/locked results
-- are immutable per README D-07) and can no longer accept marks writes.
create table if not exists exam_locks (
  institution_id uuid not null,
  component_id uuid not null,
  primary key (institution_id, component_id)
);

-- The idempotency ledger: apply_ops() checks this first so re-delivering the same op_id
-- (the client's own retries, or a duplicate network delivery) never applies twice.
create table if not exists applied_ops (
  op_id uuid primary key,
  entity text not null,
  result jsonb not null,
  applied_at timestamptz not null
);
