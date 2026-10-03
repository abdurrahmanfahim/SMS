import { useCallback, useEffect, useState } from "react";

import { useAcademic } from "./context";
import { toAcademicError, type AcademicError } from "./data/errors";
import type {
  AssignmentRow,
  ClassSubjectRow,
  LevelRow,
  SectionRow,
  SubjectRow,
  TeacherOption,
  YearRow,
} from "./data/types";

export type Resource<T> =
  | { status: "loading"; data: undefined; error: undefined; reload: () => void }
  | { status: "error"; data: undefined; error: AcademicError; reload: () => void }
  | { status: "ready"; data: T; error: undefined; reload: () => void };

/** Loads something through the repository and exposes loading, error and ready states plus reload(). */
function useResource<T>(load: () => Promise<T>, key: string): Resource<T> {
  const [state, setState] = useState<{
    status: "loading" | "error" | "ready";
    data?: T;
    error?: AcademicError;
  }>({
    status: "loading",
  });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    let cancelled = false;
    // Keep showing the old data while reloading after a change; only the first load shows the skeleton.
    load()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", error: toAcademicError(error) });
      });
    return () => {
      cancelled = true;
    };
    // `load` is rebuilt every render; `key` says when the inputs really changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  return { ...state, reload } as Resource<T>;
}

/** Academic years, newest first. Exported for other features through `shared` re-exports if needed. */
export function useAcademicYears(): Resource<YearRow[]> {
  const { repo } = useAcademic();
  return useResource(() => repo.listYears(), "years");
}

/** Sections of one year, or of every year when no id is given. */
export function useSections(academicYearId?: string): Resource<SectionRow[]> {
  const { repo } = useAcademic();
  return useResource(
    () => repo.listSections(academicYearId),
    `sections:${academicYearId ?? "all"}`,
  );
}

/** Which subjects each class level studies in one year. */
export function useClassSubjects(academicYearId: string): Resource<ClassSubjectRow[]> {
  const { repo } = useAcademic();
  return useResource(
    () => repo.listClassSubjects(academicYearId),
    `class-subjects:${academicYearId}`,
  );
}

export function useClassLevels(): Resource<LevelRow[]> {
  const { repo } = useAcademic();
  return useResource(() => repo.listLevels(), "levels");
}

export function useSubjects(): Resource<SubjectRow[]> {
  const { repo } = useAcademic();
  return useResource(() => repo.listSubjects(), "subjects");
}

export function useTeacherAssignments(academicYearId: string): Resource<AssignmentRow[]> {
  const { repo } = useAcademic();
  return useResource(() => repo.listAssignments(academicYearId), `assignments:${academicYearId}`);
}

export function useTeachers(): Resource<TeacherOption[]> {
  const { repo } = useAcademic();
  return useResource(() => repo.listTeachers(), "teachers");
}
