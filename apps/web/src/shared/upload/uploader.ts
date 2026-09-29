/** What the upload component needs from a storage backend. */
export interface UploadContext {
  /** Name to store under (already cleaned of path characters). */
  fileName: string;
  signal: AbortSignal;
  /** Report progress as a fraction from 0 to 1. */
  onProgress: (fraction: number) => void;
}

export interface UploadResult {
  /** Storage path of the uploaded object. */
  path: string;
}

/** Sends one blob to storage. Reject on failure; honour `signal` to cancel. */
export type Uploader = (blob: Blob, context: UploadContext) => Promise<UploadResult>;

/** A file name that is safe inside a storage path: no folders, no odd characters. */
export function safeFileName(name: string, fallback = "file"): string {
  // Keep only the last path segment, so `../../etc/passwd` becomes `passwd`.
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKD")
    .replace(/\.{2,}/g, ".")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^\.+/, "")
    .replace(/_+/g, "_")
    .slice(-80);
  return cleaned === "" || cleaned === "_" ? fallback : cleaned;
}

export class UploadAbortedError extends Error {
  constructor() {
    super("upload aborted");
    this.name = "UploadAbortedError";
  }
}

export interface XhrUploaderOptions {
  /** Project URL, e.g. `https://xyz.supabase.co`. */
  supabaseUrl: string;
  /** Public (anon) key. Sent as `apikey`. */
  anonKey: string;
  /** Returns the signed-in user's access token; row-level security decides what may be written. */
  getAccessToken: () => Promise<string | null>;
  bucket: string;
  /** Builds the object path from the clean file name, e.g. `(name) => \`${tenantId}/logo/${name}\``. */
  buildPath: (fileName: string) => string;
  upsert?: boolean;
}

/**
 * Uploader for Supabase Storage that reports real progress (the SDK's `upload` cannot). It calls
 * the Storage REST endpoint `POST /storage/v1/object/{bucket}/{path}` with the signed-in user's
 * token, so the same row-level security rules apply as for the SDK.
 */
export function createSupabaseXhrUploader(options: XhrUploaderOptions): Uploader {
  return async (blob, { fileName, signal, onProgress }) => {
    const token = await options.getAccessToken();
    if (!token) throw new Error("not signed in");
    const path = options.buildPath(fileName);
    const url = `${options.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(
      options.bucket,
    )}/${path.split("/").map(encodeURIComponent).join("/")}`;

    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", url);
      request.setRequestHeader("Authorization", `Bearer ${token}`);
      request.setRequestHeader("apikey", options.anonKey);
      request.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
      request.setRequestHeader("x-upsert", options.upsert ? "true" : "false");
      request.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
      };
      request.onload = () =>
        request.status >= 200 && request.status < 300
          ? resolve()
          : reject(new Error(`storage responded ${request.status}`));
      request.onerror = () => reject(new Error("network error"));
      request.ontimeout = () => reject(new Error("timeout"));
      request.onabort = () => reject(new UploadAbortedError());
      const abort = () => request.abort();
      if (signal.aborted) return reject(new UploadAbortedError());
      signal.addEventListener("abort", abort, { once: true });
      request.send(blob);
    });
    onProgress(1);
    return { path };
  };
}

/** The part of `supabase.storage` that `createSdkUploader` uses. */
export interface StorageLike {
  from: (bucket: string) => {
    upload: (
      path: string,
      body: Blob,
      options?: { contentType?: string; upsert?: boolean },
    ) => Promise<{ data: { path: string } | null; error: { message: string } | null }>;
  };
}

/** Uploader on the Supabase SDK. Simpler, but progress jumps from 0 to 100 percent and it cannot be cancelled mid-way. */
export function createSdkUploader(
  storage: StorageLike,
  bucket: string,
  buildPath: (fileName: string) => string,
  upsert = false,
): Uploader {
  return async (blob, { fileName, signal, onProgress }) => {
    if (signal.aborted) throw new UploadAbortedError();
    onProgress(0);
    const path = buildPath(fileName);
    const { data, error } = await storage
      .from(bucket)
      .upload(path, blob, { contentType: blob.type, upsert });
    if (signal.aborted) throw new UploadAbortedError();
    if (error || !data) throw new Error(error?.message ?? "upload failed");
    onProgress(1);
    return { path: data.path };
  };
}
