import type { SmsClient } from "../client";

/** The private buckets created by the M1-P1 storage migration. */
export const STORAGE_BUCKETS = ["logos", "photos", "imports", "exports"] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

/** Default lifetime of a signed URL, in seconds. */
export const DEFAULT_SIGNED_URL_SECONDS = 60;
/** The longest lifetime this helper will ever ask for, in seconds. */
export const MAX_SIGNED_URL_SECONDS = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Object path under the tenant rule of the storage policies: `<institution_id>/<segment>/...`.
 * Throws for an invalid institution id or an empty, absolute or `..` segment, so a caller cannot
 * build a path that escapes its institution folder.
 */
export function storagePath(institutionId: string, ...segments: string[]): string {
  if (!UUID.test(institutionId)) throw new Error("institutionId must be a UUID");
  if (segments.length === 0) throw new Error("storagePath needs at least one segment");
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === ".." || segment.includes("/")) {
      throw new Error(`Invalid path segment: ${JSON.stringify(segment)}`);
    }
  }
  return [institutionId.toLowerCase(), ...segments].join("/");
}

/** A signed URL lifetime clamped to 1..{@link MAX_SIGNED_URL_SECONDS} whole seconds. */
export function signedUrlLifetime(seconds: number = DEFAULT_SIGNED_URL_SECONDS): number {
  if (!Number.isFinite(seconds)) return DEFAULT_SIGNED_URL_SECONDS;
  return Math.min(MAX_SIGNED_URL_SECONDS, Math.max(1, Math.floor(seconds)));
}

export type SignedUrlResult =
  { ok: true; url: string; expiresInSeconds: number } | { ok: false; message: string };

/**
 * Creates a short-lived signed URL for a private object. The caller's own role decides whether
 * the object may be read (storage policies); the lifetime is capped at five minutes.
 */
export async function createSignedUrl(
  client: SmsClient,
  bucket: StorageBucket,
  path: string,
  seconds?: number,
): Promise<SignedUrlResult> {
  const expiresInSeconds = signedUrlLifetime(seconds);
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    return { ok: false, message: error?.message ?? "Could not create a signed URL" };
  }
  return { ok: true, url: data.signedUrl, expiresInSeconds };
}
