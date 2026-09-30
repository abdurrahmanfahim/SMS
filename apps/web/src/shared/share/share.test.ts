import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "./clipboard";
import { smsLink, whatsappLink } from "./links";
import { canShareFiles, shareFile } from "./shareFile";

const nav = navigator as unknown as Record<string, unknown>;
let clicked: HTMLAnchorElement[] = [];

beforeEach(() => {
  clicked = [];
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete nav["share"];
  delete nav["canShare"];
  delete nav["clipboard"];
});

const pdf = () => new Blob(["%PDF"], { type: "application/pdf" });

describe("shareFile", () => {
  it("shares the file through the share sheet when files are supported", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav["share"] = share;
    nav["canShare"] = vi.fn(() => true);
    const outcome = await shareFile(pdf(), { title: "Marksheet Class 6", text: "Attached" });
    expect(outcome).toBe("shared");
    const arg = share.mock.calls[0]![0] as { files: File[]; title: string; text: string };
    expect(arg.files[0]!.name).toBe("Marksheet_Class_6.pdf");
    expect(arg.files[0]!.type).toBe("application/pdf");
    expect(arg.title).toBe("Marksheet Class 6");
    expect(arg.text).toBe("Attached");
    expect(clicked).toHaveLength(0);
  });

  it("checks canShare with the actual file before sharing", async () => {
    const canShare = vi.fn(() => false);
    nav["share"] = vi.fn();
    nav["canShare"] = canShare;
    await shareFile(pdf(), { title: "x" });
    expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
    expect(nav["share"]).not.toHaveBeenCalled();
  });

  it("downloads when the browser cannot share files", async () => {
    const outcome = await shareFile(pdf(), { title: "রিপোর্ট", fileName: "report.pdf" });
    expect(outcome).toBe("downloaded");
    expect(clicked).toHaveLength(1);
    expect(clicked[0]!.download).toBe("report.pdf");
    expect(clicked[0]!.href).toBe("blob:x");
  });

  it("downloads when share exists but cannot take files (canShare false)", async () => {
    nav["share"] = vi.fn();
    nav["canShare"] = () => false;
    expect(await shareFile(pdf(), { title: "x", fileName: "a.pdf" })).toBe("downloaded");
  });

  it("reports cancelled and does not download when the person closes the share sheet", async () => {
    nav["share"] = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    nav["canShare"] = () => true;
    expect(await shareFile(pdf(), { title: "x" })).toBe("cancelled");
    expect(clicked).toHaveLength(0);
  });

  it("falls back to download when sharing is refused (tap used up)", async () => {
    nav["share"] = vi.fn().mockRejectedValue(new DOMException("no gesture", "NotAllowedError"));
    nav["canShare"] = () => true;
    expect(await shareFile(pdf(), { title: "x", fileName: "a.pdf" })).toBe("downloaded");
    expect(clicked).toHaveLength(1);
  });

  it("fetches a URL and shares the file, naming it from the URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(pdf(), { status: 200 })));
    const share = vi.fn().mockResolvedValue(undefined);
    nav["share"] = share;
    nav["canShare"] = () => true;
    expect(await shareFile("https://x.test/files/result%201.pdf?sig=1", { title: "T" })).toBe(
      "shared",
    );
    expect((share.mock.calls[0]![0] as { files: File[] }).files[0]!.name).toBe("result_1.pdf");
  });

  it("shares the link when a URL cannot be fetched and the browser can share links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("cors")));
    const share = vi.fn().mockResolvedValue(undefined);
    nav["share"] = share;
    expect(await shareFile("https://x.test/a.pdf", { title: "T", text: "see" })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ url: "https://x.test/a.pdf", title: "T", text: "see" });
  });

  it("opens the link when nothing else works", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 403 })));
    expect(await shareFile("https://x.test/a.pdf", { title: "T" })).toBe("downloaded");
    expect(clicked[0]!.href).toBe("https://x.test/a.pdf");
    expect(clicked[0]!.rel).toContain("noopener");
  });
});

describe("canShareFiles", () => {
  it("is false without the API and follows canShare with it", () => {
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    expect(canShareFiles([file])).toBe(false);
    nav["share"] = vi.fn();
    nav["canShare"] = vi.fn(() => true);
    expect(canShareFiles([file])).toBe(true);
  });
});

describe("link builders", () => {
  it("builds a WhatsApp link with encoded Bangla text and a normalised number", () => {
    const link = whatsappLink("ফলাফল\nপ্রকাশিত", "০১৭১২-৩৪৫৬৭৮");
    expect(link.startsWith("https://wa.me/8801712345678?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1]!)).toBe("ফলাফল\nপ্রকাশিত");
  });

  it("lets the sender choose the contact when there is no valid number", () => {
    expect(whatsappLink("hi")).toBe("https://wa.me/?text=hi");
    expect(whatsappLink("hi", "12345")).toBe("https://wa.me/?text=hi");
  });

  it("builds an SMS link that works on Android and iPhone", () => {
    expect(smsLink("hello world", "01712345678")).toBe("sms:+8801712345678?&body=hello%20world");
    expect(smsLink("hi")).toBe("sms:?&body=hi");
  });

  it("escapes characters that would break out of the link", () => {
    const link = whatsappLink("a&b=c#d?e");
    expect(link).toBe("https://wa.me/?text=a%26b%3Dc%23d%3Fe");
  });
});

describe("copyToClipboard", () => {
  it("uses the Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    nav["clipboard"] = { writeText };
    expect(await copyToClipboard("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to a hidden field when the API is missing or refused", async () => {
    const exec = vi.fn(() => true);
    document.execCommand = exec;
    expect(await copyToClipboard("hello")).toBe(true);
    nav["clipboard"] = { writeText: vi.fn().mockRejectedValue(new Error("denied")) };
    expect(await copyToClipboard("again")).toBe(true);
    expect(exec).toHaveBeenCalledTimes(2);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("returns false instead of throwing when nothing works", async () => {
    document.execCommand = vi.fn(() => {
      throw new Error("blocked");
    });
    expect(await copyToClipboard("x")).toBe(false);
  });
});
