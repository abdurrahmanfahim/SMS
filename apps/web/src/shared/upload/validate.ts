/** Image types accepted by default: no SVG (it can carry scripts) and no GIF (no use for photos here). */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface ValidateOptions {
  /** Allowed MIME types, e.g. `["image/jpeg", "application/pdf"]`. */
  accept: readonly string[];
  /** Largest allowed file size in bytes. */
  maxBytes: number;
}

export type ValidationResult = { ok: true } | { ok: false; code: "type" | "size" | "empty" };

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  csv: "text/csv",
};

/** The file's MIME type; when the browser gives none (some Android file managers), guess from the extension. */
export function fileType(file: { name: string; type: string }): string {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? "";
}

/** Checks type and size before anything is read or uploaded. Empty files are rejected too. */
export function validateFile(
  file: { name: string; type: string; size: number },
  { accept, maxBytes }: ValidateOptions,
): ValidationResult {
  if (!accept.includes(fileType(file))) return { ok: false, code: "type" };
  if (file.size === 0) return { ok: false, code: "empty" };
  if (file.size > maxBytes) return { ok: false, code: "size" };
  return { ok: true };
}

/** `["image/jpeg","image/png"]` becomes `"JPG, PNG"` for messages. */
export function typeLabels(accept: readonly string[]): string {
  const names = new Set<string>();
  for (const type of accept) {
    const sub = type.split("/")[1] ?? type;
    names.add(sub === "jpeg" ? "JPG" : sub.toUpperCase());
  }
  return [...names].join(", ");
}
