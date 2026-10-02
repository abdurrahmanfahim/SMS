-- M1-A1 step 1a: academic structure tables (docs/spec/domain-model.md section 3):
-- academic_years, class_levels, sections, subjects, class_subjects, teacher_assignments.
-- Every table follows docs/spec/rls-patterns.md section 2: composite tenant foreign keys,
-- set_updated_at, forbid_institution_id_change. RLS is in the next migration, auditing in the
-- one after. Forward-only: never edit this file once applied.
--
-- Class levels and subjects are data, never enums (schools, madrasas and coaching centres differ).
-- Deleting a level, section, subject or year that other rows depend on is blocked by the
-- composite foreign keys (ON DELETE RESTRICT), so nothing is ever deleted silently.

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- academic_years: no overlapping ranges, one current year, ends_on > starts_on
-- ---------------------------------------------------------------------------
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name_bn text,
  name_en text,
  calendar text not null default 'gregorian',
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint academic_years_tenant_id_unique unique (institution_id, id),
  constraint academic_years_calendar_check check (calendar in ('gregorian', 'hijri')),
  constraint academic_years_name_present check (
    length(btrim(coalesce(name_bn, ''))) > 0 or length(btrim(coalesce(name_en, ''))) > 0
  ),
  constraint academic_years_dates_check check (ends_on > starts_on),
  -- Two years of one institution may not share a day (both ends inclusive).
  constraint academic_years_no_overlap exclude using gist (
    institution_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  )
);

-- One current year per institution.
create unique index academic_years_one_current
  on public.academic_years (institution_id) where is_current;
-- Duplicate names are rejected (case-insensitive, ignoring outer spaces), per language.
create unique index academic_years_name_bn_unique
  on public.academic_years (institution_id, lower(btrim(name_bn))) where name_bn is not null;
create unique index academic_years_name_en_unique
  on public.academic_years (institution_id, lower(btrim(name_en))) where name_en is not null;

-- ---------------------------------------------------------------------------
-- class_levels: data, not enum. name_bn unique per the spec; name_en too (assumption, so an
-- English-only institution cannot create duplicates either).
-- ---------------------------------------------------------------------------
create table public.class_levels (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name_bn text,
  name_en text,
  sort_order integer not null default 0,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint class_levels_tenant_id_unique unique (institution_id, id),
  constraint class_levels_name_bn_unique unique (institution_id, name_bn),
  constraint class_levels_category_check check (
    category is null or category in ('school', 'madrasa', 'coaching', 'other')
  ),
  constraint class_levels_name_present check (
    length(btrim(coalesce(name_bn, ''))) > 0 or length(btrim(coalesce(name_en, ''))) > 0
  )
);
create unique index class_levels_name_en_unique
  on public.class_levels (institution_id, lower(btrim(name_en))) where name_en is not null;
create index class_levels_sort_idx on public.class_levels (institution_id, sort_order);

-- ---------------------------------------------------------------------------
-- sections: one class level in one academic year
-- ---------------------------------------------------------------------------
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  academic_year_id uuid not null,
  class_level_id uuid not null,
  name text not null,
  shift text,
  class_teacher_membership_id uuid,
  capacity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint sections_tenant_id_unique unique (institution_id, id),
  -- Lets teacher_assignments prove that its section belongs to the year it names.
  constraint sections_tenant_year_id_unique unique (institution_id, academic_year_id, id),
  constraint sections_name_unique unique (institution_id, academic_year_id, class_level_id, name),
  constraint sections_name_present check (length(btrim(name)) > 0),
  constraint sections_shift_check check (shift is null or length(btrim(shift)) between 1 and 30),
  constraint sections_capacity_check check (capacity is null or capacity > 0),
  constraint sections_year_fk foreign key (institution_id, academic_year_id)
    references public.academic_years (institution_id, id) on delete restrict,
  constraint sections_level_fk foreign key (institution_id, class_level_id)
    references public.class_levels (institution_id, id) on delete restrict,
  -- A null class_teacher_membership_id is not checked (MATCH SIMPLE), which is what we want.
  constraint sections_class_teacher_fk foreign key (institution_id, class_teacher_membership_id)
    references public.memberships (institution_id, id) on delete set null (class_teacher_membership_id)
);
create index sections_year_level_idx on public.sections (institution_id, academic_year_id, class_level_id);
create index sections_class_teacher_idx on public.sections (institution_id, class_teacher_membership_id)
  where class_teacher_membership_id is not null;

-- ---------------------------------------------------------------------------
-- subjects: the catalogue
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name_bn text,
  name_en text,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint subjects_tenant_id_unique unique (institution_id, id),
  constraint subjects_name_bn_unique unique (institution_id, name_bn),
  constraint subjects_code_check check (code is null or length(btrim(code)) between 1 and 20),
  constraint subjects_name_present check (
    length(btrim(coalesce(name_bn, ''))) > 0 or length(btrim(coalesce(name_en, ''))) > 0
  )
);
create unique index subjects_name_en_unique
  on public.subjects (institution_id, lower(btrim(name_en))) where name_en is not null;
create unique index subjects_code_unique
  on public.subjects (institution_id, lower(btrim(code))) where code is not null;

-- ---------------------------------------------------------------------------
-- class_subjects: which subjects a class level has in a year, optional or not
-- ---------------------------------------------------------------------------
create table public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  academic_year_id uuid not null,
  class_level_id uuid not null,
  subject_id uuid not null,
  is_optional boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint class_subjects_tenant_id_unique unique (institution_id, id),
  constraint class_subjects_unique unique (institution_id, academic_year_id, class_level_id, subject_id),
  constraint class_subjects_year_fk foreign key (institution_id, academic_year_id)
    references public.academic_years (institution_id, id) on delete restrict,
  constraint class_subjects_level_fk foreign key (institution_id, class_level_id)
    references public.class_levels (institution_id, id) on delete restrict,
  constraint class_subjects_subject_fk foreign key (institution_id, subject_id)
    references public.subjects (institution_id, id) on delete restrict
);
create index class_subjects_subject_idx on public.class_subjects (institution_id, subject_id);

-- ---------------------------------------------------------------------------
-- teacher_assignments: who teaches what. A null subject_id means class teacher.
-- ---------------------------------------------------------------------------
create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  academic_year_id uuid not null,
  membership_id uuid not null,
  section_id uuid not null,
  subject_id uuid,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint teacher_assignments_tenant_id_unique unique (institution_id, id),
  constraint teacher_assignments_role_check check (
    (role = 'class_teacher' and subject_id is null)
    or (role = 'subject_teacher' and subject_id is not null)
  ),
  constraint teacher_assignments_year_fk foreign key (institution_id, academic_year_id)
    references public.academic_years (institution_id, id) on delete restrict,
  constraint teacher_assignments_membership_fk foreign key (institution_id, membership_id)
    references public.memberships (institution_id, id) on delete cascade,
  -- The section must belong to the same year as the assignment.
  constraint teacher_assignments_section_fk foreign key (institution_id, academic_year_id, section_id)
    references public.sections (institution_id, academic_year_id, id) on delete restrict,
  constraint teacher_assignments_subject_fk foreign key (institution_id, subject_id)
    references public.subjects (institution_id, id) on delete restrict
);
-- The same teacher cannot be given the same subject in a section twice (null subject = class
-- teacher, so the zero uuid stands in for it), and a section has one class teacher.
create unique index teacher_assignments_unique
  on public.teacher_assignments (
    institution_id, section_id, membership_id,
    coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create unique index teacher_assignments_one_class_teacher
  on public.teacher_assignments (institution_id, section_id) where role = 'class_teacher';
create index teacher_assignments_membership_idx on public.teacher_assignments (institution_id, membership_id);
create index teacher_assignments_section_idx on public.teacher_assignments (institution_id, section_id);

-- ---------------------------------------------------------------------------
-- Teacher assignment rules that a foreign key cannot express:
--   * the membership must be a teacher of the institution;
--   * sections.class_teacher_membership_id mirrors the class_teacher assignment, so the two
--     can never disagree (the assignment row is the source of truth).
-- ---------------------------------------------------------------------------
create function private.acad_teacher_assignment_check()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  member_role text;
begin
  select m.role into member_role
  from public.memberships m
  where m.institution_id = new.institution_id and m.id = new.membership_id;
  if member_role is null then
    -- Same effect as the composite foreign key, raised here because this BEFORE trigger runs first.
    raise exception 'membership does not belong to this institution' using errcode = '23503';
  end if;
  if member_role is distinct from 'teacher' then
    raise exception 'only a teacher can be assigned to a section' using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function private.acad_teacher_assignment_check() is
  'BEFORE INSERT OR UPDATE trigger on teacher_assignments: the membership must exist in the institution and have role teacher.';

create function private.acad_sync_class_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.role = 'class_teacher' then
    update public.sections s set class_teacher_membership_id = null
    where s.institution_id = old.institution_id and s.id = old.section_id
      and s.class_teacher_membership_id is not distinct from old.membership_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.role = 'class_teacher' then
    update public.sections s set class_teacher_membership_id = new.membership_id
    where s.institution_id = new.institution_id and s.id = new.section_id;
  end if;
  return null;
end;
$$;

comment on function private.acad_sync_class_teacher() is
  'AFTER trigger on teacher_assignments: keeps sections.class_teacher_membership_id equal to the '
  'class_teacher assignment of the section. SECURITY DEFINER because the caller may not own the sections row.';

revoke execute on function private.acad_teacher_assignment_check() from public;
revoke execute on function private.acad_sync_class_teacher() from public;

create trigger acad_teacher_assignment_check before insert or update on public.teacher_assignments
  for each row execute function private.acad_teacher_assignment_check();
create trigger acad_sync_class_teacher after insert or update or delete on public.teacher_assignments
  for each row execute function private.acad_sync_class_teacher();

-- ---------------------------------------------------------------------------
-- Standard triggers on every table
-- ---------------------------------------------------------------------------
create trigger set_updated_at before update on public.academic_years
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.academic_years
  for each row execute function private.forbid_institution_id_change();

create trigger set_updated_at before update on public.class_levels
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.class_levels
  for each row execute function private.forbid_institution_id_change();

create trigger set_updated_at before update on public.sections
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.sections
  for each row execute function private.forbid_institution_id_change();

create trigger set_updated_at before update on public.subjects
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.subjects
  for each row execute function private.forbid_institution_id_change();

create trigger set_updated_at before update on public.class_subjects
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.class_subjects
  for each row execute function private.forbid_institution_id_change();

create trigger set_updated_at before update on public.teacher_assignments
  for each row execute function private.set_updated_at();
create trigger forbid_institution_id_change before update on public.teacher_assignments
  for each row execute function private.forbid_institution_id_change();
