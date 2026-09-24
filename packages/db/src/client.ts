import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

export type SmsClient = SupabaseClient<Database>;

export interface SmsClientConfig {
  url: string;
  anonKey: string;
}

/**
 * Typed Supabase client factory. Takes the URL and anon key explicitly rather
 * than reaching into `import.meta.env`/`process.env` itself, so this package
 * stays usable from any runtime (Vite app, a Node script, a Deno Edge
 * Function) without assuming which one it's in. No key of any kind is
 * hardcoded here or anywhere in this package — see createSmsClientFromEnv
 * below for the Vite-app convenience wrapper that actually reads the env.
 */
export function createSmsClient({ url, anonKey }: SmsClientConfig): SmsClient {
  if (!url || !anonKey) {
    throw new Error(
      "createSmsClient: both url and anonKey are required. Never hardcode " +
        "these — pass values read from your runtime's own env/config " +
        "(see .env.example at the repo root).",
    );
  }
  return createClient<Database>(url, anonKey);
}

/**
 * Convenience wrapper for `apps/web` (a Vite app): reads
 * `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from `import.meta.env` and
 * throws a clear error if either is missing, rather than silently
 * constructing a client that will fail on first request. The anon key is
 * public-by-design (Supabase's row level security is what actually protects
 * data, per README §3.2) — this is not a secret and is safe to ship in a
 * client bundle. The service_role key must NEVER be read or used here.
 */
export function createSmsClientFromEnv(): SmsClient {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const url = env?.VITE_SUPABASE_URL;
  const anonKey = env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "createSmsClientFromEnv: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
        "must be set (see .env.example). This helper only works in a Vite " +
        "app; use createSmsClient(...) directly in any other runtime.",
    );
  }
  return createSmsClient({ url, anonKey });
}
