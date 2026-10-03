import type { Preset } from "./presets/types";

/**
 * Pure academic-structure rules. The database enforces every one of these as well (exclusion
 * constraint, unique indexes, foreign keys); these functions exist so the screens can explain a
 * problem before the request is sent and plan a preset without guessing. They have no I/O.
 * (They live in the feature because packages/domain is outside this task's owned paths; see the report.)
 */

export interface YearRange {
  id?: string;
  startsOn: string;
  endsOn: string;
}

export type YearCheck =
  | { ok: true }
  | { ok: false; reason: "invalid_dates" | "end_before_start" }
  | { ok: false; reason: "overlap"; overlapsWith: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Both ends inclusive, as in the database constraint daterange(starts_on, ends_on, '[]'). */
export function rangesOverlap(a: YearRange, b: YearRange): boolean {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

/** Checks a year before it is saved. `existing` is every other year of the institution. */
export function checkYear(candidate: YearRange, existing: readonly YearRange[]): YearCheck {
  if (!ISO.test(candidate.startsOn) || !ISO.test(candidate.endsOn)) {
    return { ok: false, reason: "invalid_dates" };
  }
  if (candidate.endsOn <= candidate.startsOn) return { ok: false, reason: "end_before_start" };
  for (const other of existing) {
    if (other.id !== undefined && other.id === candidate.id) continue;
    if (rangesOverlap(candidate, other)) {
      return { ok: false, reason: "overlap", overlapsWith: other.id ?? "" };
    }
  }
  return { ok: true };
}

/** Same comparison the database unique indexes use: case-insensitive, outer spaces ignored. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function hasDuplicateName(
  name: string,
  existing: readonly (string | null | undefined)[],
): boolean {
  const wanted = normalizeName(name);
  if (wanted === "") return false;
  return existing.some(
    (other) => other !== null && other !== undefined && normalizeName(other) === wanted,
  );
}

/** Moves `id` one place up or down. Returns the same order when it is already at the edge. */
export function moveId(ids: readonly string[], id: string, direction: "up" | "down"): string[] {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as string);
  return next;
}

/** sort_order values (1, 2, 3, ...) for an ordered list of ids. */
export function sortOrders(ids: readonly string[]): { id: string; sortOrder: number }[] {
  return ids.map((id, index) => ({ id, sortOrder: index + 1 }));
}

export interface ExistingStructure {
  levelNames: readonly (string | null)[]; // name_bn and name_en of every level, flattened by the caller
  subjectNames: readonly (string | null)[];
  sectionKeys: readonly string[]; // `${levelId}|${normalizedName}` for the target year
  levels: readonly { id: string; nameBn: string | null; nameEn: string | null }[];
  subjects: readonly { id: string; nameBn: string | null; nameEn: string | null }[];
  classSubjectKeys: readonly string[]; // `${levelId}|${subjectId}` for the target year
}

export interface PresetPlan {
  /** Levels and subjects that do not exist yet (matched by name, either language). */
  newLevels: Preset["levels"];
  newSubjects: Preset["subjects"];
  /** Sections and class subjects are resolved to ids by the repository after the levels exist. */
  sectionNames: readonly string[];
  /** How many things are already there and will be left alone. */
  skippedLevels: number;
  skippedSubjects: number;
}

/**
 * Plans what applying a preset would add. Applying twice is safe: anything that already exists
 * (same name, ignoring case and outer spaces) is skipped, so a half-finished apply can be repeated.
 */
export function planPreset(preset: Preset, existing: ExistingStructure): PresetPlan {
  const has = (names: readonly (string | null)[], bn: string, en: string) =>
    hasDuplicateName(bn, names) || hasDuplicateName(en, names);
  const newLevels = preset.levels.filter((l) => !has(existing.levelNames, l.nameBn, l.nameEn));
  const newSubjects = preset.subjects.filter(
    (s) => !has(existing.subjectNames, s.nameBn, s.nameEn),
  );
  return {
    newLevels,
    newSubjects,
    sectionNames: preset.sectionNames,
    skippedLevels: preset.levels.length - newLevels.length,
    skippedSubjects: preset.subjects.length - newSubjects.length,
  };
}

/** Finds the existing row a preset item matches, by either name. */
export function matchByName<T extends { id: string; nameBn: string | null; nameEn: string | null }>(
  rows: readonly T[],
  bn: string,
  en: string,
): T | undefined {
  return rows.find(
    (row) =>
      (row.nameBn !== null && normalizeName(row.nameBn) === normalizeName(bn)) ||
      (row.nameEn !== null && normalizeName(row.nameEn) === normalizeName(en)),
  );
}
