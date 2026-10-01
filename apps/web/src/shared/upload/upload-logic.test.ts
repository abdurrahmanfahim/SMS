import { afterEach, describe, expect, it, vi } from "vitest";

import { computeCropRect, dragOffsets, fitWithin } from "./imageMath";
import {
  UploadAbortedError,
  createSdkUploader,
  createSupabaseXhrUploader,
  safeFileName,
} from "./uploader";
import { IMAGE_TYPES, fileType, typeLabels, validateFile } from "./validate";

describe("validateFile", () => {
  const opts = { accept: IMAGE_TYPES, maxBytes: 1000 };
  it("accepts an allowed type within the size limit", () => {
    expect(validateFile({ name: "a.jpg", type: "image/jpeg", size: 999 }, opts)).toEqual({
      ok: true,
    });
    expect(validateFile({ name: "a.jpg", type: "image/jpeg", size: 1000 }, opts)).toEqual({
      ok: true,
    });
  });
  it("rejects a wrong type, an oversize file and an empty file with a code", () => {
    expect(validateFile({ name: "a.gif", type: "image/gif", size: 10 }, opts)).toEqual({
      ok: false,
      code: "type",
    });
    expect(validateFile({ name: "a.svg", type: "image/svg+xml", size: 10 }, opts)).toEqual({
      ok: false,
      code: "type",
    });
    expect(validateFile({ name: "a.jpg", type: "image/jpeg", size: 1001 }, opts)).toEqual({
      ok: false,
      code: "size",
    });
    expect(validateFile({ name: "a.jpg", type: "image/jpeg", size: 0 }, opts)).toEqual({
      ok: false,
      code: "empty",
    });
  });
  it("checks the type before the size", () => {
    expect(
      validateFile({ name: "a.exe", type: "application/x-msdownload", size: 99999 }, opts),
    ).toEqual({
      ok: false,
      code: "type",
    });
  });
  it("guesses the type from the extension when the browser gives none", () => {
    expect(fileType({ name: "PHOTO.JPG", type: "" })).toBe("image/jpeg");
    expect(fileType({ name: "notes.xyz", type: "" })).toBe("");
    expect(validateFile({ name: "photo.png", type: "", size: 10 }, opts)).toEqual({ ok: true });
  });
  it("names the accepted types for messages", () => {
    expect(typeLabels(IMAGE_TYPES)).toBe("JPG, PNG, WEBP");
    expect(typeLabels(["application/pdf"])).toBe("PDF");
  });
});

describe("fitWithin", () => {
  it("scales the longer side down and keeps the ratio", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });
  it("never scales up", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("computeCropRect", () => {
  it("at zoom 1 fits the largest frame of the aspect, centred", () => {
    expect(computeCropRect(400, 300, { aspect: 1, zoom: 1, offsetX: 0, offsetY: 0 })).toEqual({
      x: 50,
      y: 0,
      width: 300,
      height: 300,
    });
    expect(computeCropRect(300, 400, { aspect: 1, zoom: 1, offsetX: 0, offsetY: 0 })).toEqual({
      x: 0,
      y: 50,
      width: 300,
      height: 300,
    });
  });
  it("zooming shrinks the frame and offsets slide it to the edges without leaving the image", () => {
    const left = computeCropRect(400, 300, { aspect: 1, zoom: 2, offsetX: -1, offsetY: -1 });
    expect(left).toEqual({ x: 0, y: 0, width: 150, height: 150 });
    const right = computeCropRect(400, 300, { aspect: 1, zoom: 2, offsetX: 1, offsetY: 1 });
    expect(right).toEqual({ x: 250, y: 150, width: 150, height: 150 });
  });
  it("clamps offsets and zoom below 1", () => {
    expect(computeCropRect(400, 300, { aspect: 1, zoom: 0.2, offsetX: 5, offsetY: -5 })).toEqual({
      x: 100,
      y: 0,
      width: 300,
      height: 300,
    });
  });
  it("supports non-square frames", () => {
    const rect = computeCropRect(400, 300, { aspect: 2, zoom: 1, offsetX: 0, offsetY: 0 });
    expect(rect.width / rect.height).toBeCloseTo(2);
    expect(rect.width).toBe(400);
  });
});

describe("dragOffsets", () => {
  const state = { aspect: 1, zoom: 2, offsetX: 0, offsetY: 0 };
  it("dragging the picture right moves the frame left", () => {
    const next = dragOffsets(state, 10, 0, 280, 400, 300);
    expect(next.offsetX).toBeLessThan(0);
    expect(next.offsetY).toBe(0);
  });
  it("stays within -1 and 1", () => {
    expect(dragOffsets(state, 100000, 100000, 280, 400, 300)).toEqual({ offsetX: -1, offsetY: -1 });
    expect(dragOffsets(state, -100000, -100000, 280, 400, 300)).toEqual({ offsetX: 1, offsetY: 1 });
  });
  it("has nothing to move when the frame fills the image on that axis", () => {
    const full = { aspect: 1, zoom: 1, offsetX: 0.3, offsetY: 0.3 };
    expect(dragOffsets(full, 50, 50, 280, 300, 300)).toEqual({ offsetX: 0, offsetY: 0 });
  });
});

describe("safeFileName", () => {
  it("removes folders and odd characters", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\Users\\me\\logo..png")).toBe("logo.png");
    expect(safeFileName("লোগো final (1).png")).toMatch(/^[\w.-]+$/);
    expect(safeFileName("...")).toBe("file");
    expect(safeFileName("", "photo.jpg")).toBe("photo.jpg");
  });
  it("keeps Bangla letters only when asked (downloads and shares, not storage keys)", () => {
    expect(safeFileName("মার্কশিট ৬ষ্ঠ.pdf", "file", { unicode: true })).toBe("মার্কশিট_৬ষ্ঠ.pdf");
    expect(safeFileName("মার্কশিট ৬ষ্ঠ.pdf")).toMatch(/^[\w.-]+$/);
    expect(safeFileName("../../ফলাফল.pdf", "file", { unicode: true })).toBe("ফলাফল.pdf");
  });
  it("keeps a normal name and limits the length", () => {
    expect(safeFileName("logo.png")).toBe("logo.png");
    expect(safeFileName("a".repeat(200) + ".png").length).toBeLessThanOrEqual(80);
  });
});

class FakeXhr {
  static last: FakeXhr;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  status = 200;
  body: unknown;
  aborted = false;
  upload: {
    onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void;
  } = {};
  onload?: () => void;
  onerror?: () => void;
  ontimeout?: () => void;
  onabort?: () => void;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

describe("createSupabaseXhrUploader", () => {
  afterEach(() => vi.unstubAllGlobals());
  const make = (token: string | null = "tok") =>
    createSupabaseXhrUploader({
      supabaseUrl: "https://x.supabase.co/",
      anonKey: "anon",
      getAccessToken: async () => token,
      bucket: "logos",
      buildPath: (name) => `tenant 1/${name}`,
    });
  const blob = new Blob(["abc"], { type: "image/jpeg" });

  it("posts the blob with the user token, reports progress and returns the path", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const progress: number[] = [];
    const pending = make()(blob, {
      fileName: "a.jpg",
      signal: new AbortController().signal,
      onProgress: (f) => progress.push(f),
    });
    await vi.waitFor(() => expect(FakeXhr.last?.body).toBe(blob));
    const xhr = FakeXhr.last;
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("https://x.supabase.co/storage/v1/object/logos/tenant%201/a.jpg");
    expect(xhr.headers["Authorization"]).toBe("Bearer tok");
    expect(xhr.headers["apikey"]).toBe("anon");
    expect(xhr.headers["Content-Type"]).toBe("image/jpeg");
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 });
    xhr.onload?.();
    await expect(pending).resolves.toEqual({ path: "tenant 1/a.jpg" });
    expect(progress).toEqual([0.25, 1]);
  });

  it("rejects on a server error, a network error and when not signed in", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const ctx = () => ({
      fileName: "a.jpg",
      signal: new AbortController().signal,
      onProgress: () => undefined,
    });
    const failed = make()(blob, ctx());
    await vi.waitFor(() => expect(FakeXhr.last?.body).toBe(blob));
    FakeXhr.last.status = 413;
    FakeXhr.last.onload?.();
    await expect(failed).rejects.toThrow("413");

    const offline = make()(blob, ctx());
    await vi.waitFor(() => expect(FakeXhr.last?.body).toBe(blob));
    FakeXhr.last.onerror?.();
    await expect(offline).rejects.toThrow("network");

    await expect(make(null)(blob, ctx())).rejects.toThrow("not signed in");
  });

  it("aborts the request when the signal fires", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const controller = new AbortController();
    const pending = make()(blob, {
      fileName: "a.jpg",
      signal: controller.signal,
      onProgress: () => undefined,
    });
    await vi.waitFor(() => expect(FakeXhr.last?.body).toBe(blob));
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(UploadAbortedError);
    expect(FakeXhr.last.aborted).toBe(true);
  });
});

describe("createSdkUploader", () => {
  const blob = new Blob(["abc"], { type: "image/png" });
  const ctx = { fileName: "a.png", signal: new AbortController().signal, onProgress: vi.fn() };
  it("uploads through the SDK and returns the stored path", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "t/a.png" }, error: null });
    const uploader = createSdkUploader({ from: () => ({ upload }) }, "logos", (n) => `t/${n}`);
    await expect(uploader(blob, ctx)).resolves.toEqual({ path: "t/a.png" });
    expect(upload).toHaveBeenCalledWith("t/a.png", blob, {
      contentType: "image/png",
      upsert: false,
    });
  });
  it("throws the SDK error", async () => {
    const upload = vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } });
    const uploader = createSdkUploader({ from: () => ({ upload }) }, "logos", (n) => n);
    await expect(uploader(blob, ctx)).rejects.toThrow("denied");
  });
});
