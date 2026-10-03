/** Public surface of the academic feature. Other features read academic data only through these hooks. */
export { useAcademicYears, useClassSubjects, useSections } from "./hooks";
export type { Resource } from "./hooks";
export type {
  AssignmentRow,
  ClassSubjectRow,
  LevelRow,
  SectionRow,
  SubjectRow,
  YearRow,
} from "./data/types";
