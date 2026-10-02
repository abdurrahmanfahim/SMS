import type { Database } from "@sms/db";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type YearRow = Row<"academic_years">;
export type LevelRow = Row<"class_levels">;
export type SectionRow = Row<"sections">;
export type SubjectRow = Row<"subjects">;
export type ClassSubjectRow = Row<"class_subjects">;
export type AssignmentRow = Row<"teacher_assignments">;

export interface TeacherOption {
  membershipId: string;
  name: string;
}

export interface YearInput {
  nameBn: string;
  nameEn: string;
  startsOn: string;
  endsOn: string;
}

export interface LevelInput {
  nameBn: string;
  nameEn: string;
  category: LevelRow["category"];
}

export interface SectionInput {
  academicYearId: string;
  classLevelId: string;
  name: string;
  shift: string;
  capacity: number | null;
}

export interface SubjectInput {
  nameBn: string;
  nameEn: string;
  code: string;
}

export interface AssignmentInput {
  academicYearId: string;
  membershipId: string;
  sectionId: string;
  subjectId: string | null;
}
