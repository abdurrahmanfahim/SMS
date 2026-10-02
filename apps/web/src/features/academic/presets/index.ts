import { blankPreset } from "./blank";
import { school110Preset } from "./school-1-10";
import type { Preset } from "./types";

export type { Preset, PresetLevel, PresetSubject } from "./types";
export { blankPreset, school110Preset };

/** The presets offered by the first-run picker, in display order. No madrasa preset until M0-O1 findings exist. */
export const PRESETS: readonly Preset[] = [school110Preset, blankPreset];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
