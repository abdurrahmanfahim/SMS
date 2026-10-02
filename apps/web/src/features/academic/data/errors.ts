/**
 * Database errors turned into something a person can act on. Postgres reports a SQLSTATE code
 * and, for constraints, the constraint name; both are mapped to i18n keys so the screen shows
 * a clear sentence in the person's language (never a raw database message).
 */
export type AcademicErrorKey =
  | "academic.error.overlap"
  | "academic.error.duplicateName"
  | "academic.error.duplicateCode"
  | "academic.error.duplicateSection"
  | "academic.error.duplicateMapping"
  | "academic.error.duplicateAssignment"
  | "academic.error.oneCurrentYear"
  | "academic.error.classTeacherTaken"
  | "academic.error.hasDependants"
  | "academic.error.invalidDates"
  | "academic.error.nameRequired"
  | "academic.error.notTeacher"
  | "academic.error.notAllowed"
  | "academic.error.notFound"
  | "academic.error.generic";

export class AcademicError extends Error {
  readonly key: AcademicErrorKey;
  constructor(key: AcademicErrorKey, cause?: unknown) {
    super(key);
    this.name = "AcademicError";
    this.key = key;
    if (cause !== undefined) this.cause = cause;
  }
}

interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string;
}

/** Maps a PostgREST error to an AcademicError. Unknown errors become the generic key. */
export function toAcademicError(error: unknown): AcademicError {
  if (error instanceof AcademicError) return error;
  const e = (error ?? {}) as DbErrorLike;
  const text = `${e.message ?? ""} ${e.details ?? ""}`;
  switch (e.code) {
    case "23P01":
      return new AcademicError("academic.error.overlap", error);
    case "23505":
      if (text.includes("academic_years_one_current"))
        return new AcademicError("academic.error.oneCurrentYear", error);
      if (text.includes("subjects_code_unique"))
        return new AcademicError("academic.error.duplicateCode", error);
      if (text.includes("sections_name_unique"))
        return new AcademicError("academic.error.duplicateSection", error);
      if (text.includes("class_subjects_unique"))
        return new AcademicError("academic.error.duplicateMapping", error);
      if (text.includes("teacher_assignments_one_class_teacher"))
        return new AcademicError("academic.error.classTeacherTaken", error);
      if (text.includes("teacher_assignments_unique"))
        return new AcademicError("academic.error.duplicateAssignment", error);
      return new AcademicError("academic.error.duplicateName", error);
    case "23503":
      // A delete blocked by a dependant row, or a row pointing at something of another institution.
      return new AcademicError(
        text.includes("membership does not belong")
          ? "academic.error.notFound"
          : "academic.error.hasDependants",
        error,
      );
    case "23514":
      if (text.includes("only a teacher"))
        return new AcademicError("academic.error.notTeacher", error);
      return new AcademicError("academic.error.invalidDates", error);
    case "42501":
      return new AcademicError("academic.error.notAllowed", error);
    case "P0002":
      return new AcademicError("academic.error.notAllowed", error);
    default:
      return new AcademicError("academic.error.generic", error);
  }
}
