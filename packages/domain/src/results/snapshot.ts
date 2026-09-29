/**
 * Snapshot helpers (spec §8): canonical JSON and a SHA-256 checksum, so a published result can be
 * verified later. Only plain ESM and Web Crypto are used, so this runs in Node, browsers and Deno.
 */

/** JSON-compatible value accepted by {@link canonicalJson}. */
export type Json =
  null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json | undefined };

function canonical(value: Json | undefined): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonicalJson: numbers must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item: Json | undefined) => (item === undefined ? "null" : canonical(item))).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as { readonly [key: string]: Json | undefined };
    const parts: string[] = [];
    for (const key of Object.keys(record).sort()) {
      const item = record[key];
      if (item !== undefined) parts.push(`${JSON.stringify(key)}:${canonical(item)}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new TypeError("canonicalJson: unsupported value");
}

/**
 * Serializes a value as canonical JSON: object keys sorted by code unit, no whitespace, keys with
 * `undefined` values left out. The same data always gives the same text. Throws a `TypeError` for
 * values JSON cannot hold (`NaN`, infinities, `bigint`, functions); the engine's own output never
 * contains them.
 */
export function canonicalJson(value: Json): string {
  return canonical(value);
}

/** SHA-256 of a text (UTF-8) as 64 lowercase hex characters, using Web Crypto. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** What a snapshot's checksum covers: the full rules and every result row. */
export type SnapshotContent = { readonly rules: Json; readonly rows: readonly Json[] };

/** Checksum of a snapshot: SHA-256 over the canonical JSON of its rules and all rows. */
export function snapshotChecksum(content: SnapshotContent): Promise<string> {
  return sha256Hex(canonicalJson({ rules: content.rules, rows: content.rows }));
}

/** Recomputes the checksum of `content` and compares it with `expected` (case-insensitive hex). */
export async function verifySnapshot(content: SnapshotContent, expected: string): Promise<boolean> {
  return (await snapshotChecksum(content)) === expected.toLowerCase();
}
