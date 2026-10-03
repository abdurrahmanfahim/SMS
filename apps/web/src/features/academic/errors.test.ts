import { describe, expect, it } from "vitest";

import { AcademicError, toAcademicError } from "./data/errors";

describe("toAcademicError", () => {
  it("maps the database codes to clear keys", () => {
    expect(toAcademicError({ code: "23P01" }).key).toBe("academic.error.overlap");
    expect(
      toAcademicError({
        code: "23505",
        message: 'violates unique constraint "academic_years_one_current"',
      }).key,
    ).toBe("academic.error.oneCurrentYear");
    expect(
      toAcademicError({
        code: "23505",
        message: 'violates unique constraint "sections_name_unique"',
      }).key,
    ).toBe("academic.error.duplicateSection");
    expect(
      toAcademicError({
        code: "23505",
        message: 'violates unique constraint "subjects_code_unique"',
      }).key,
    ).toBe("academic.error.duplicateCode");
    expect(
      toAcademicError({
        code: "23505",
        message: 'violates unique constraint "class_levels_name_bn_unique"',
      }).key,
    ).toBe("academic.error.duplicateName");
    expect(
      toAcademicError({
        code: "23505",
        message: 'violates unique constraint "teacher_assignments_one_class_teacher"',
      }).key,
    ).toBe("academic.error.classTeacherTaken");
    expect(
      toAcademicError({
        code: "23503",
        message: "violates foreign key constraint",
        details: 'Key (id)=(x) is still referenced from table "sections".',
      }).key,
    ).toBe("academic.error.hasDependants");
    expect(
      toAcademicError({ code: "23514", message: "only a teacher can be assigned to a section" })
        .key,
    ).toBe("academic.error.notTeacher");
    expect(
      toAcademicError({
        code: "23514",
        message: 'violates check constraint "academic_years_dates_check"',
      }).key,
    ).toBe("academic.error.invalidDates");
    expect(toAcademicError({ code: "42501" }).key).toBe("academic.error.notAllowed");
  });
  it("never leaks a raw database message and keeps AcademicError as is", () => {
    expect(toAcademicError({ code: "XX000", message: "secret internals" }).key).toBe(
      "academic.error.generic",
    );
    expect(toAcademicError(new Error("boom")).key).toBe("academic.error.generic");
    const own = new AcademicError("academic.error.overlap");
    expect(toAcademicError(own)).toBe(own);
  });
});
