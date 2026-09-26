/**
 * Cleans up a name for storage or display: trims, collapses any run of whitespace to a single
 * space, and NFC-normalizes it so visually identical names typed through different input methods
 * (e.g. a Bangla conjunct entered as a precomposed glyph vs. base+combining marks) compare equal.
 *
 * This never rejects input — an empty result from an empty or whitespace-only name is a valid
 * output; whether an empty name is acceptable is a decision for the caller (e.g. a required-field
 * check), not this function.
 *
 * @example normalizeName("  Abdur   Rahman  ") // "Abdur Rahman"
 */
export function normalizeName(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/g, " ");
}

// Strips a combining mark that directly follows a plain ASCII Latin letter (café -> cafe), but
// leaves marks after any other base character untouched — in particular the Bengali nukta (a
// combining mark used by ড়/ঢ়/য়), which changes the letter rather than merely accenting it.
const LATIN_LETTER_WITH_MARKS = /([A-Za-z])\p{Mn}+/gu;

/**
 * Builds a search/matching key for a name: case- and diacritic-insensitive for English/Latin names
 * ("José" and "jose" produce the same key), and stable — but otherwise unchanged — for Bangla
 * names, so the same visual name always produces the same key however it was typed or previously
 * normalized.
 *
 * Case folding uses plain `toLowerCase()` rather than a locale-aware casing, since locale casing
 * can change letters unexpectedly for names outside that locale (Turkish's dotted/dotless I is the
 * classic example). This is a matching key, not a display value — never show it to a user.
 *
 * @example nameSearchKey("José") === nameSearchKey("jose") // true
 * @example nameSearchKey("ড়") === nameSearchKey("ড়") // true for either input Unicode form
 */
export function nameSearchKey(input: string): string {
  const decomposed = normalizeName(input).normalize("NFD");
  const latinFolded = decomposed.replace(LATIN_LETTER_WITH_MARKS, "$1");
  return latinFolded.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}
