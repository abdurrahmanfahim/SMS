import { safeFileName } from "../upload/uploader";

export interface ShareOptions {
  /** Title passed to the share sheet. */
  title: string;
  /** Message text that goes with the file. */
  text?: string;
  /** File name to use. Default: taken from the URL, else built from the title. */
  fileName?: string;
}

/**
 * What happened: `shared` (the share sheet took it), `downloaded` (no file sharing here, so the
 * file was saved instead) or `cancelled` (the person closed the share sheet; nothing was saved).
 */
export type ShareOutcome = "shared" | "downloaded" | "cancelled";

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/csv": "csv",
  "text/plain": "txt",
};

/** True when this browser can hand `files` to its share sheet. Always check this before sharing files. */
export function canShareFiles(files: File[]): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

function nameFor(source: Blob | string, options: ShareOptions): string {
  if (options.fileName) return safeFileName(options.fileName, "file", { unicode: true });
  if (typeof source === "string") {
    const last = source.split("?")[0]?.split("/").pop();
    if (last && last.includes("."))
      return safeFileName(decodeURIComponent(last), "file", { unicode: true });
  }
  const type = typeof source === "string" ? "" : source.type;
  const extension = EXTENSIONS[type];
  const base = safeFileName(options.title, "file", { unicode: true });
  return extension && !base.endsWith(`.${extension}`) ? `${base}.${extension}` : base;
}

/** Saves a file through a temporary link. This is the fallback wherever file sharing is missing. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before the address goes away.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Shares a file through the phone's share sheet (WhatsApp, Messages, Drive and so on) when the
 * browser supports sharing files, and downloads it otherwise.
 *
 * Pass a `Blob` you already have where you can: browsers only allow the share sheet to open right
 * after a tap, and downloading a URL first can use up that moment. If a URL cannot be fetched
 * (blocked by CORS or offline), the link itself is shared instead when the browser can share
 * links, else the link is opened for download.
 *
 * @example
 * const outcome = await shareFile(pdfBlob, { title: "Marksheet - Class 6", text: "Marksheet attached" });
 */
export async function shareFile(
  source: Blob | string,
  options: ShareOptions,
): Promise<ShareOutcome> {
  let blob: Blob;
  if (typeof source === "string") {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`fetch ${response.status}`);
      blob = await response.blob();
    } catch {
      return shareLinkOrOpen(source, options);
    }
  } else {
    blob = source;
  }

  const fileName = nameFor(source, options);
  const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });

  if (canShareFiles([file])) {
    try {
      await navigator.share({ files: [file], title: options.title, text: options.text });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
      // NotAllowedError (the tap was used up) or any other failure: save the file instead.
    }
  }
  downloadBlob(file, fileName);
  return "downloaded";
}

async function shareLinkOrOpen(url: string, options: ShareOptions): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ url, title: options.title, text: options.text });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
    }
  }
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return "downloaded";
}
