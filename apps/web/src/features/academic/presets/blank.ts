import type { Preset } from "./types";

/** Blank start: nothing is created; the admin builds the structure by hand. */
export const blankPreset: Preset = {
  id: "blank",
  titleKey: "academic.preset.blank.title",
  descriptionKey: "academic.preset.blank.description",
  levels: [],
  sectionNames: [],
  subjects: [],
  classSubjects: [],
};
