/**
 * A UUID in canonical lowercase, hyphenated form (`8-4-4-4-12` hex digits), the shape Postgres's
 * `gen_random_uuid()` produces and every tenant row's `id`/`institution_id` uses. Build values with
 * {@link uuid}.
 *
 * This package never generates ids (that needs randomness, which a pure function does not have —
 * ids are minted by the database, per `docs/spec/domain-model.md`); it only validates and
 * canonicalizes ones it is given.
 */
export type Uuid = string & { readonly __brand: "Uuid" };

/** Outcome of {@link uuid}. */
export type UuidResult =
  | { readonly ok: true; readonly value: Uuid }
  | { readonly ok: false; readonly reason: "invalid_format" };

// Accepts any RFC 4122 shape (8-4-4-4-12 hex), without checking the version/variant nibbles, so a
// v1/v4/v7 id from any source validates the same way.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates `value` as a UUID and returns it in canonical lowercase form.
 *
 * @example uuid("3F2504E0-4F89-41D3-9A0C-0305E82C3301")
 * // { ok: true, value: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" }
 */
export function uuid(value: string): UuidResult {
  if (!UUID_PATTERN.test(value)) return { ok: false, reason: "invalid_format" };
  return { ok: true, value: value.toLowerCase() as Uuid };
}
