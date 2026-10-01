/**
 * @sms/db — generated database types and a typed Supabase client factory.
 */
export type { Database, Json } from "./types";
export { createSmsClient, createSmsClientFromEnv } from "./client";
export type { SmsClient, SmsClientConfig } from "./client";
export {
  createSignedUrl,
  DEFAULT_SIGNED_URL_SECONDS,
  MAX_SIGNED_URL_SECONDS,
  signedUrlLifetime,
  storagePath,
  STORAGE_BUCKETS,
} from "./plat/storage";
export type { SignedUrlResult, StorageBucket } from "./plat/storage";
