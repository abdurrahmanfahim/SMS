import type { SmsClient } from "@sms/db";

import type { Preset } from "../presets/types";
import { matchByName, planPreset } from "../rules";

import { toAcademicError } from "./errors";
import type {
  AssignmentInput,
  AssignmentRow,
  ClassSubjectRow,
  LevelInput,
  LevelRow,
  SectionInput,
  SectionRow,
  SubjectInput,
  SubjectRow,
  TeacherOption,
  YearInput,
  YearRow,
} from "./types";

/** What applying a preset did, for the confirmation message. */
export interface PresetResult {
  levelsAdded: number;
  levelsSkipped: number;
  subjectsAdded: number;
  sectionsAdded: number;
  mappingsAdded: number;
}

/**
 * Everything the academic screens read and write. The Supabase implementation below is the real
 * one; tests pass an in-memory one. The database (RLS, constraints) is always the authority: this
 * layer never decides who may do what, it only turns failures into AcademicError.
 */
export interface AcademicRepository {
  listYears(): Promise<YearRow[]>;
  createYear(input: YearInput): Promise<void>;
  updateYear(id: string, input: YearInput): Promise<void>;
  setCurrentYear(id: string): Promise<void>;
  deleteYear(id: string): Promise<void>;

  listLevels(): Promise<LevelRow[]>;
  createLevel(input: LevelInput): Promise<void>;
  updateLevel(id: string, input: LevelInput): Promise<void>;
  reorderLevels(orderedIds: string[]): Promise<void>;
  deleteLevel(id: string): Promise<void>;

  listSections(academicYearId?: string): Promise<SectionRow[]>;
  createSection(input: SectionInput): Promise<void>;
  updateSection(id: string, input: SectionInput): Promise<void>;
  deleteSection(id: string): Promise<void>;

  listSubjects(): Promise<SubjectRow[]>;
  createSubject(input: SubjectInput): Promise<void>;
  updateSubject(id: string, input: SubjectInput): Promise<void>;
  deleteSubject(id: string): Promise<void>;

  listClassSubjects(academicYearId: string): Promise<ClassSubjectRow[]>;
  addClassSubject(academicYearId: string, classLevelId: string, subjectId: string): Promise<void>;
  setClassSubjectOptional(id: string, isOptional: boolean): Promise<void>;
  removeClassSubject(id: string): Promise<void>;

  /** Teachers the signed-in person may see (what RLS allows); empty when none are visible. */
  listTeachers(): Promise<TeacherOption[]>;
  listAssignments(academicYearId: string): Promise<AssignmentRow[]>;
  createAssignment(input: AssignmentInput): Promise<void>;
  deleteAssignment(id: string): Promise<void>;

  applyPreset(preset: Preset, academicYearId: string): Promise<PresetResult>;
}

const blankToNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());

function check<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toAcademicError(result.error);
  return (result.data ?? ([] as unknown)) as T;
}

/** Real repository over the typed Supabase client for one institution. */
export function createSupabaseRepository(
  client: SmsClient,
  institutionId: string,
): AcademicRepository {
  const scoped = { institution_id: institutionId };

  const repo: AcademicRepository = {
    async listYears() {
      return check(
        await client
          .from("academic_years")
          .select("*")
          .eq("institution_id", institutionId)
          .order("starts_on", { ascending: false }),
      );
    },
    async createYear(input) {
      check(
        await client.from("academic_years").insert({
          ...scoped,
          name_bn: blankToNull(input.nameBn),
          name_en: blankToNull(input.nameEn),
          starts_on: input.startsOn,
          ends_on: input.endsOn,
        }),
      );
    },
    async updateYear(id, input) {
      check(
        await client
          .from("academic_years")
          .update({
            name_bn: blankToNull(input.nameBn),
            name_en: blankToNull(input.nameEn),
            starts_on: input.startsOn,
            ends_on: input.endsOn,
          })
          .eq("id", id),
      );
    },
    async setCurrentYear(id) {
      check(await client.rpc("set_current_academic_year", { p_year_id: id }));
    },
    async deleteYear(id) {
      check(await client.from("academic_years").delete().eq("id", id));
    },

    async listLevels() {
      return check(
        await client
          .from("class_levels")
          .select("*")
          .eq("institution_id", institutionId)
          .order("sort_order")
          .order("created_at"),
      );
    },
    async createLevel(input) {
      const existing = await repo.listLevels();
      const next = existing.reduce((max, level) => Math.max(max, level.sort_order), 0) + 1;
      check(
        await client.from("class_levels").insert({
          ...scoped,
          name_bn: blankToNull(input.nameBn),
          name_en: blankToNull(input.nameEn),
          category: input.category,
          sort_order: next,
        }),
      );
    },
    async updateLevel(id, input) {
      check(
        await client
          .from("class_levels")
          .update({
            name_bn: blankToNull(input.nameBn),
            name_en: blankToNull(input.nameEn),
            category: input.category,
          })
          .eq("id", id),
      );
    },
    async reorderLevels(orderedIds) {
      for (const [index, id] of orderedIds.entries()) {
        check(
          await client
            .from("class_levels")
            .update({ sort_order: index + 1 })
            .eq("id", id),
        );
      }
    },
    async deleteLevel(id) {
      check(await client.from("class_levels").delete().eq("id", id));
    },

    async listSections(academicYearId) {
      let query = client.from("sections").select("*").eq("institution_id", institutionId);
      if (academicYearId !== undefined) query = query.eq("academic_year_id", academicYearId);
      return check(await query.order("name"));
    },
    async createSection(input) {
      check(
        await client.from("sections").insert({
          ...scoped,
          academic_year_id: input.academicYearId,
          class_level_id: input.classLevelId,
          name: input.name.trim(),
          shift: blankToNull(input.shift),
          capacity: input.capacity,
        }),
      );
    },
    async updateSection(id, input) {
      check(
        await client
          .from("sections")
          .update({
            name: input.name.trim(),
            shift: blankToNull(input.shift),
            capacity: input.capacity,
          })
          .eq("id", id),
      );
    },
    async deleteSection(id) {
      check(await client.from("sections").delete().eq("id", id));
    },

    async listSubjects() {
      return check(
        await client
          .from("subjects")
          .select("*")
          .eq("institution_id", institutionId)
          .order("created_at"),
      );
    },
    async createSubject(input) {
      check(
        await client.from("subjects").insert({
          ...scoped,
          name_bn: blankToNull(input.nameBn),
          name_en: blankToNull(input.nameEn),
          code: blankToNull(input.code),
        }),
      );
    },
    async updateSubject(id, input) {
      check(
        await client
          .from("subjects")
          .update({
            name_bn: blankToNull(input.nameBn),
            name_en: blankToNull(input.nameEn),
            code: blankToNull(input.code),
          })
          .eq("id", id),
      );
    },
    async deleteSubject(id) {
      check(await client.from("subjects").delete().eq("id", id));
    },

    async listClassSubjects(academicYearId) {
      return check(
        await client
          .from("class_subjects")
          .select("*")
          .eq("institution_id", institutionId)
          .eq("academic_year_id", academicYearId)
          .order("sort_order")
          .order("created_at"),
      );
    },
    async addClassSubject(academicYearId, classLevelId, subjectId) {
      check(
        await client.from("class_subjects").insert({
          ...scoped,
          academic_year_id: academicYearId,
          class_level_id: classLevelId,
          subject_id: subjectId,
        }),
      );
    },
    async setClassSubjectOptional(id, isOptional) {
      check(await client.from("class_subjects").update({ is_optional: isOptional }).eq("id", id));
    },
    async removeClassSubject(id) {
      check(await client.from("class_subjects").delete().eq("id", id));
    },

    async listTeachers() {
      const memberships = check(
        await client
          .from("memberships")
          .select("id, profile_id")
          .eq("institution_id", institutionId)
          .eq("role", "teacher")
          .eq("status", "active"),
      );
      if (memberships.length === 0) return [];
      const profiles = check(
        await client
          .from("profiles")
          .select("id, full_name")
          .in(
            "id",
            memberships.map((m) => m.profile_id),
          ),
      );
      const names = new Map(profiles.map((p) => [p.id, p.full_name]));
      return memberships.map((m) => ({ membershipId: m.id, name: names.get(m.profile_id) ?? "" }));
    },
    async listAssignments(academicYearId) {
      return check(
        await client
          .from("teacher_assignments")
          .select("*")
          .eq("institution_id", institutionId)
          .eq("academic_year_id", academicYearId)
          .order("created_at"),
      );
    },
    async createAssignment(input) {
      check(
        await client.from("teacher_assignments").insert({
          ...scoped,
          academic_year_id: input.academicYearId,
          membership_id: input.membershipId,
          section_id: input.sectionId,
          subject_id: input.subjectId,
          role: input.subjectId === null ? "class_teacher" : "subject_teacher",
        }),
      );
    },
    async deleteAssignment(id) {
      check(await client.from("teacher_assignments").delete().eq("id", id));
    },

    async applyPreset(preset, academicYearId) {
      // Safe to repeat: whatever exists already (same name) is left alone, so a half-finished
      // apply can simply be run again. The steps are separate requests, not one transaction.
      const [levels0, subjects0] = await Promise.all([repo.listLevels(), repo.listSubjects()]);
      const plan = planPreset(preset, {
        levelNames: levels0.flatMap((l) => [l.name_bn, l.name_en]),
        subjectNames: subjects0.flatMap((s) => [s.name_bn, s.name_en]),
        sectionKeys: [],
        levels: [],
        subjects: [],
        classSubjectKeys: [],
      });
      const maxOrder = levels0.reduce((max, l) => Math.max(max, l.sort_order), 0);
      if (plan.newLevels.length > 0) {
        check(
          await client.from("class_levels").insert(
            plan.newLevels.map((l, i) => ({
              ...scoped,
              name_bn: l.nameBn,
              name_en: l.nameEn,
              category: l.category,
              sort_order: maxOrder + i + 1,
            })),
          ),
        );
      }
      if (plan.newSubjects.length > 0) {
        check(
          await client.from("subjects").insert(
            plan.newSubjects.map((s) => ({
              ...scoped,
              name_bn: s.nameBn,
              name_en: s.nameEn,
              code: s.code,
            })),
          ),
        );
      }
      const [levels, subjects, sections0, mappings0] = await Promise.all([
        repo.listLevels(),
        repo.listSubjects(),
        repo.listSections(academicYearId),
        repo.listClassSubjects(academicYearId),
      ]);
      const asNames = (rows: { id: string; name_bn: string | null; name_en: string | null }[]) =>
        rows.map((r) => ({ id: r.id, nameBn: r.name_bn, nameEn: r.name_en }));
      const levelRows = asNames(levels);
      const subjectRows = asNames(subjects);

      const haveSection = new Set(
        sections0.map((s) => `${s.class_level_id}|${s.name.trim().toLowerCase()}`),
      );
      const newSections: { classLevelId: string; name: string }[] = [];
      const haveMapping = new Set(mappings0.map((m) => `${m.class_level_id}|${m.subject_id}`));
      const newMappings: { classLevelId: string; subjectId: string; order: number }[] = [];
      for (const level of preset.levels) {
        const levelRow = matchByName(levelRows, level.nameBn, level.nameEn);
        if (levelRow === undefined) continue;
        for (const name of preset.sectionNames) {
          if (!haveSection.has(`${levelRow.id}|${name.trim().toLowerCase()}`)) {
            newSections.push({ classLevelId: levelRow.id, name });
          }
        }
        const wanted =
          preset.classSubjects.find((c) => c.levelKey === level.key)?.subjectKeys ?? [];
        for (const [order, key] of wanted.entries()) {
          const subject = preset.subjects.find((s) => s.key === key);
          const subjectRow = subject && matchByName(subjectRows, subject.nameBn, subject.nameEn);
          if (subjectRow && !haveMapping.has(`${levelRow.id}|${subjectRow.id}`)) {
            newMappings.push({
              classLevelId: levelRow.id,
              subjectId: subjectRow.id,
              order: order + 1,
            });
          }
        }
      }
      if (newSections.length > 0) {
        check(
          await client.from("sections").insert(
            newSections.map((s) => ({
              ...scoped,
              academic_year_id: academicYearId,
              class_level_id: s.classLevelId,
              name: s.name,
            })),
          ),
        );
      }
      if (newMappings.length > 0) {
        check(
          await client.from("class_subjects").insert(
            newMappings.map((m) => ({
              ...scoped,
              academic_year_id: academicYearId,
              class_level_id: m.classLevelId,
              subject_id: m.subjectId,
              sort_order: m.order,
            })),
          ),
        );
      }
      return {
        levelsAdded: plan.newLevels.length,
        levelsSkipped: plan.skippedLevels,
        subjectsAdded: plan.newSubjects.length,
        sectionsAdded: newSections.length,
        mappingsAdded: newMappings.length,
      };
    },
  };
  return repo;
}
