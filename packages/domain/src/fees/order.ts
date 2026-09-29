/**
 * Orders two strings by UTF-16 code unit, so sorting never depends on the runtime's locale.
 * Internal helper of `fees/` (not exported from the package).
 */
export function compareIds(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
