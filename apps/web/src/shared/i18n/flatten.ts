/** Flattens `{ a: { b: "x" } }` into `{ "a.b": "x" }`. Non-string leaves are rejected. */
export function flattenMessages(input: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(`i18n file must contain an object${prefix ? ` at "${prefix}"` : ""}`);
  }
  for (const [key, value] of Object.entries(input)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[full] = value;
    else if (typeof value === "object" && value !== null && !Array.isArray(value))
      Object.assign(out, flattenMessages(value, full));
    else throw new Error(`i18n value at "${full}" must be a string or an object`);
  }
  return out;
}
