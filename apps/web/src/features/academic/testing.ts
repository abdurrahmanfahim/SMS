import { AcademicError } from "./data/errors";
import type { AcademicRepository, PresetResult } from "./data/repository";
import type {
  AssignmentRow,
  ClassSubjectRow,
  LevelRow,
  SectionRow,
  SubjectRow,
  TeacherOption,
  YearRow,
} from "./data/types";
import { checkYear, hasDuplicateName, matchByName, planPreset } from "./rules";

const AUDIT = {
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  created_by: null,
  updated_by: null,
};
const INSTITUTION = "00000000-0000-0000-0000-0000000000aa";

export interface MemoryData {
  years: YearRow[];
  levels: LevelRow[];
  sections: SectionRow[];
  subjects: SubjectRow[];
  classSubjects: ClassSubjectRow[];
  assignments: AssignmentRow[];
  teachers: TeacherOption[];
}

export const emptyData = (): MemoryData => ({
  years: [],
  levels: [],
  sections: [],
  subjects: [],
  classSubjects: [],
  assignments: [],
  teachers: [],
});

let counter = 0;
const id = () => `00000000-0000-0000-0000-${String(++counter).padStart(12, "0")}`;

export const makeYear = (over: Partial<YearRow> = {}): YearRow => ({
  id: id(),
  institution_id: INSTITUTION,
  name_bn: null,
  name_en: "2026",
  calendar: "gregorian",
  starts_on: "2026-01-01",
  ends_on: "2026-12-31",
  is_current: false,
  ...AUDIT,
  ...over,
});
export const makeLevel = (over: Partial<LevelRow> = {}): LevelRow => ({
  id: id(),
  institution_id: INSTITUTION,
  name_bn: null,
  name_en: "Class 1",
  sort_order: 1,
  category: null,
  ...AUDIT,
  ...over,
});
export const makeSubject = (over: Partial<SubjectRow> = {}): SubjectRow => ({
  id: id(),
  institution_id: INSTITUTION,
  name_bn: null,
  name_en: "Bangla",
  code: null,
  ...AUDIT,
  ...over,
});

/**
 * In-memory repository for tests. It mimics the database rules the screens depend on (overlap,
 * duplicate names, deletes blocked by dependants) and records every call, so a test can assert
 * what a screen asked for. It is NOT the database: real behaviour is proven by pgTAP.
 */
export function memoryRepository(data: MemoryData, opts: { failList?: boolean } = {}) {
  const calls: string[] = [];
  const guard = () => {
    if (opts.failList) throw new AcademicError("academic.error.generic");
  };
  const repo: AcademicRepository = {
    async listYears() {
      guard();
      return [...data.years];
    },
    async createYear(input) {
      calls.push("createYear");
      const others = data.years.map((y) => ({
        id: y.id,
        startsOn: y.starts_on,
        endsOn: y.ends_on,
      }));
      if (!checkYear({ startsOn: input.startsOn, endsOn: input.endsOn }, others).ok)
        throw new AcademicError("academic.error.overlap");
      data.years.push(
        makeYear({
          name_bn: input.nameBn || null,
          name_en: input.nameEn || null,
          starts_on: input.startsOn,
          ends_on: input.endsOn,
        }),
      );
    },
    async updateYear(yearId, input) {
      calls.push("updateYear");
      const y = data.years.find((r) => r.id === yearId);
      if (y)
        Object.assign(y, {
          name_bn: input.nameBn || null,
          name_en: input.nameEn || null,
          starts_on: input.startsOn,
          ends_on: input.endsOn,
        });
    },
    async setCurrentYear(yearId) {
      calls.push(`setCurrentYear:${yearId}`);
      for (const y of data.years) y.is_current = y.id === yearId;
    },
    async deleteYear(yearId) {
      calls.push("deleteYear");
      if (data.sections.some((s) => s.academic_year_id === yearId))
        throw new AcademicError("academic.error.hasDependants");
      data.years = data.years.filter((y) => y.id !== yearId);
    },
    async listLevels() {
      guard();
      return [...data.levels].sort((a, b) => a.sort_order - b.sort_order);
    },
    async createLevel(input) {
      calls.push("createLevel");
      if (
        hasDuplicateName(
          input.nameEn,
          data.levels.map((l) => l.name_en),
        )
      )
        throw new AcademicError("academic.error.duplicateName");
      data.levels.push(
        makeLevel({
          name_bn: input.nameBn || null,
          name_en: input.nameEn || null,
          sort_order: data.levels.length + 1,
          category: input.category,
        }),
      );
    },
    async updateLevel(levelId, input) {
      calls.push("updateLevel");
      const l = data.levels.find((r) => r.id === levelId);
      if (l)
        Object.assign(l, {
          name_bn: input.nameBn || null,
          name_en: input.nameEn || null,
          category: input.category,
        });
    },
    async reorderLevels(orderedIds) {
      calls.push(`reorderLevels:${orderedIds.join(",")}`);
      orderedIds.forEach((levelId, i) => {
        const l = data.levels.find((r) => r.id === levelId);
        if (l) l.sort_order = i + 1;
      });
    },
    async deleteLevel(levelId) {
      calls.push("deleteLevel");
      if (data.sections.some((s) => s.class_level_id === levelId))
        throw new AcademicError("academic.error.hasDependants");
      data.levels = data.levels.filter((l) => l.id !== levelId);
    },
    async listSections(yearId) {
      guard();
      return data.sections.filter((s) => yearId === undefined || s.academic_year_id === yearId);
    },
    async createSection(input) {
      calls.push("createSection");
      data.sections.push({
        id: id(),
        institution_id: INSTITUTION,
        academic_year_id: input.academicYearId,
        class_level_id: input.classLevelId,
        name: input.name,
        shift: input.shift || null,
        class_teacher_membership_id: null,
        capacity: input.capacity,
        ...AUDIT,
      });
    },
    async updateSection(sectionId, input) {
      calls.push("updateSection");
      const s = data.sections.find((r) => r.id === sectionId);
      if (s)
        Object.assign(s, {
          name: input.name,
          shift: input.shift || null,
          capacity: input.capacity,
        });
    },
    async deleteSection(sectionId) {
      calls.push("deleteSection");
      if (data.assignments.some((a) => a.section_id === sectionId))
        throw new AcademicError("academic.error.hasDependants");
      data.sections = data.sections.filter((s) => s.id !== sectionId);
    },
    async listSubjects() {
      guard();
      return [...data.subjects];
    },
    async createSubject(input) {
      calls.push("createSubject");
      data.subjects.push(
        makeSubject({
          name_bn: input.nameBn || null,
          name_en: input.nameEn || null,
          code: input.code || null,
        }),
      );
    },
    async updateSubject(subjectId, input) {
      calls.push("updateSubject");
      const s = data.subjects.find((r) => r.id === subjectId);
      if (s)
        Object.assign(s, {
          name_bn: input.nameBn || null,
          name_en: input.nameEn || null,
          code: input.code || null,
        });
    },
    async deleteSubject(subjectId) {
      calls.push("deleteSubject");
      if (data.classSubjects.some((c) => c.subject_id === subjectId))
        throw new AcademicError("academic.error.hasDependants");
      data.subjects = data.subjects.filter((s) => s.id !== subjectId);
    },
    async listClassSubjects(yearId) {
      guard();
      return data.classSubjects.filter((c) => c.academic_year_id === yearId);
    },
    async addClassSubject(yearId, levelId, subjectId) {
      calls.push("addClassSubject");
      data.classSubjects.push({
        id: id(),
        institution_id: INSTITUTION,
        academic_year_id: yearId,
        class_level_id: levelId,
        subject_id: subjectId,
        is_optional: false,
        sort_order: 0,
        ...AUDIT,
      });
    },
    async setClassSubjectOptional(mappingId, isOptional) {
      calls.push(`setOptional:${isOptional}`);
      const c = data.classSubjects.find((r) => r.id === mappingId);
      if (c) c.is_optional = isOptional;
    },
    async removeClassSubject(mappingId) {
      calls.push("removeClassSubject");
      data.classSubjects = data.classSubjects.filter((c) => c.id !== mappingId);
    },
    async listTeachers() {
      guard();
      return [...data.teachers];
    },
    async listAssignments(yearId) {
      guard();
      return data.assignments.filter((a) => a.academic_year_id === yearId);
    },
    async createAssignment(input) {
      calls.push("createAssignment");
      data.assignments.push({
        id: id(),
        institution_id: INSTITUTION,
        academic_year_id: input.academicYearId,
        membership_id: input.membershipId,
        section_id: input.sectionId,
        subject_id: input.subjectId,
        role: input.subjectId === null ? "class_teacher" : "subject_teacher",
        ...AUDIT,
      });
    },
    async deleteAssignment(assignmentId) {
      calls.push("deleteAssignment");
      data.assignments = data.assignments.filter((a) => a.id !== assignmentId);
    },
    async applyPreset(preset, yearId): Promise<PresetResult> {
      calls.push(`applyPreset:${preset.id}`);
      const plan = planPreset(preset, {
        levelNames: data.levels.flatMap((l) => [l.name_bn, l.name_en]),
        subjectNames: data.subjects.flatMap((s) => [s.name_bn, s.name_en]),
        sectionKeys: [],
        levels: [],
        subjects: [],
        classSubjectKeys: [],
      });
      for (const l of plan.newLevels)
        data.levels.push(
          makeLevel({
            name_bn: l.nameBn,
            name_en: l.nameEn,
            sort_order: data.levels.length + 1,
            category: l.category,
          }),
        );
      for (const s of plan.newSubjects)
        data.subjects.push(makeSubject({ name_bn: s.nameBn, name_en: s.nameEn, code: s.code }));
      let sections = 0;
      let mappings = 0;
      const asRows = <T extends { id: string; name_bn: string | null; name_en: string | null }>(
        rows: T[],
      ) => rows.map((r) => ({ id: r.id, nameBn: r.name_bn, nameEn: r.name_en }));
      for (const level of preset.levels) {
        const row = matchByName(asRows(data.levels), level.nameBn, level.nameEn);
        if (!row) continue;
        for (const name of preset.sectionNames) {
          if (
            !data.sections.some(
              (s) =>
                s.academic_year_id === yearId && s.class_level_id === row.id && s.name === name,
            )
          ) {
            await repo.createSection({
              academicYearId: yearId,
              classLevelId: row.id,
              name,
              shift: "",
              capacity: null,
            });
            sections++;
          }
        }
        for (const key of preset.classSubjects.find((c) => c.levelKey === level.key)?.subjectKeys ??
          []) {
          const subject = preset.subjects.find((s) => s.key === key);
          const sRow =
            subject && matchByName(asRows(data.subjects), subject.nameBn, subject.nameEn);
          if (
            sRow &&
            !data.classSubjects.some(
              (c) =>
                c.academic_year_id === yearId &&
                c.class_level_id === row.id &&
                c.subject_id === sRow.id,
            )
          ) {
            await repo.addClassSubject(yearId, row.id, sRow.id);
            mappings++;
          }
        }
      }
      return {
        levelsAdded: plan.newLevels.length,
        levelsSkipped: plan.skippedLevels,
        subjectsAdded: plan.newSubjects.length,
        sectionsAdded: sections,
        mappingsAdded: mappings,
      };
    },
  };
  return { repo, calls };
}
