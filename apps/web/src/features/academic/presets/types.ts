/** A starting structure an institution can apply with one tap. Data only; see rules.ts for planning. */
export interface PresetLevel {
  key: string;
  nameBn: string;
  nameEn: string;
  sortOrder: number;
  category: "school" | "madrasa" | "coaching" | "other";
}

export interface PresetSubject {
  key: string;
  nameBn: string;
  nameEn: string;
  code: string;
}

export interface Preset {
  id: string;
  /** i18n keys, so the picker shows the preset in the person's language. */
  titleKey: string;
  descriptionKey: string;
  levels: PresetLevel[];
  /** Section names created for every level (in the chosen year). */
  sectionNames: string[];
  subjects: PresetSubject[];
  /** Which subject keys each level studies (all required; optional flags are set by hand later). */
  classSubjects: { levelKey: string; subjectKeys: string[] }[];
}
