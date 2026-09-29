import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";

import { FileUpload } from "./FileUpload";
import type { Uploader } from "./uploader";

const image = vi.hoisted(() => ({
  compressImage: vi.fn(async (blob: Blob) => new Blob(["small"], { type: blob.type })),
}));

vi.mock("./image", async (original) => ({
  ...(await original<typeof import("./image")>()),
  compressImage: image.compressImage,
}));

vi.mock("./ImageCropper", () => ({
  ImageCropper: (props: { onConfirm: (b: Blob) => void; onCancel: () => void; aspect: number }) => (
    <div role="dialog" aria-label="crop" data-aspect={props.aspect}>
      <button
        type="button"
        onClick={() => props.onConfirm(new Blob(["cropped"], { type: "image/jpeg" }))}
      >
        confirm-crop
      </button>
      <button type="button" onClick={props.onCancel}>
        cancel-crop
      </button>
    </div>
  ),
}));

beforeEach(() => {
  setLocale("bn");
  image.compressImage.mockClear();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

const file = (name: string, type: string, bytes = 100) =>
  new File([new Uint8Array(bytes)], name, { type });

function pick(testId: string, f: File) {
  fireEvent.change(screen.getByTestId(testId), { target: { files: [f] } });
}

const okUploader = (): Uploader =>
  vi.fn(async (_blob, { onProgress }) => {
    onProgress(0.5);
    onProgress(1);
    return { path: "t/photo.jpg" };
  });

describe("FileUpload validation", () => {
  it("rejects a wrong-type file with a translated message and never uploads", () => {
    const upload = okUploader();
    render(<FileUpload label="লোগো" upload={upload} onUploaded={vi.fn()} />);
    pick("upload-gallery", file("a.gif", "image/gif"));
    expect(screen.getByTestId("upload-error")).toHaveTextContent(
      "এই ধরনের ফাইল নেওয়া যায় না। শুধু JPG, PNG, WEBP দিন।",
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects an oversize file and says the limit", () => {
    const upload = okUploader();
    render(<FileUpload label="লোগো" upload={upload} onUploaded={vi.fn()} maxBytes={1024 * 1024} />);
    pick("upload-gallery", file("big.jpg", "image/jpeg", 1024 * 1024 + 1));
    expect(screen.getByTestId("upload-error")).toHaveTextContent("ফাইলটি");
    expect(screen.getByTestId("upload-error")).toHaveTextContent("এর চেয়ে বড়");
    expect(screen.getByTestId("upload-error")).toHaveTextContent("১");
    expect(upload).not.toHaveBeenCalled();
  });

  it("shows the same messages in English", () => {
    setLocale("en");
    render(
      <FileUpload
        label="Logo"
        upload={okUploader()}
        onUploaded={vi.fn()}
        maxBytes={2 * 1024 * 1024}
      />,
    );
    pick("upload-gallery", file("a.pdf", "application/pdf"));
    expect(screen.getByTestId("upload-error")).toHaveTextContent("Use only JPG, PNG, WEBP.");
    pick("upload-gallery", file("big.jpg", "image/jpeg", 2 * 1024 * 1024 + 1));
    expect(screen.getByTestId("upload-error")).toHaveTextContent("larger than 2 MB");
  });

  it("rejects an empty file", () => {
    render(<FileUpload label="লোগো" upload={okUploader()} onUploaded={vi.fn()} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg", 0));
    expect(screen.getByTestId("upload-error")).toHaveTextContent("ফাইলটি খালি");
  });

  it("rejects a compressed photo that is still too big", async () => {
    image.compressImage.mockResolvedValueOnce(
      new Blob([new Uint8Array(500)], { type: "image/jpeg" }),
    );
    const upload = okUploader();
    render(<FileUpload label="লোগো" upload={upload} onUploaded={vi.fn()} maxUploadBytes={100} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg", 50));
    expect(await screen.findByTestId("upload-error")).toHaveTextContent("এর চেয়ে বড়");
    expect(upload).not.toHaveBeenCalled();
  });
});

describe("FileUpload happy path", () => {
  it("compresses, uploads with a safe name, reports progress and calls onUploaded", async () => {
    const upload = okUploader();
    const onUploaded = vi.fn();
    render(<FileUpload label="লোগো" upload={upload} onUploaded={onUploaded} />);
    pick("upload-gallery", file("লোগো ছবি.jpg", "image/jpeg", 5000));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledOnce());
    expect(image.compressImage).toHaveBeenCalledOnce();
    const [, context] = (upload as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(context.fileName).toMatch(/^[\w.-]+$/);
    expect(onUploaded.mock.calls[0]![0]).toEqual({ path: "t/photo.jpg" });
    expect(screen.getByText("আপলোড হয়েছে")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "বেছে নেওয়া ছবি" })).toBeInTheDocument();
  });

  it("shows a progress bar while uploading", async () => {
    let release: () => void = () => undefined;
    const upload: Uploader = (_b, { onProgress }) =>
      new Promise((resolve) => {
        onProgress(0.4);
        release = () => resolve({ path: "p" });
      });
    render(<FileUpload label="লোগো" upload={upload} onUploaded={vi.fn()} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg"));
    const bar = await screen.findByRole("progressbar", { name: "আপলোডের অগ্রগতি" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("আপলোড হচ্ছে: ৪০%")).toBeInTheDocument();
    await act(async () => release());
  });

  it("skips compression when compress is false", async () => {
    const onUploaded = vi.fn();
    render(
      <FileUpload label="লোগো" upload={okUploader()} onUploaded={onUploaded} compress={false} />,
    );
    pick("upload-gallery", file("a.jpg", "image/jpeg"));
    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    expect(image.compressImage).not.toHaveBeenCalled();
  });

  it("gives the camera button a capture input and the gallery button a plain one", () => {
    render(<FileUpload label="লোগো" upload={okUploader()} onUploaded={vi.fn()} />);
    expect(screen.getByTestId("upload-camera")).toHaveAttribute("capture", "environment");
    expect(screen.getByTestId("upload-gallery")).not.toHaveAttribute("capture");
    expect(screen.getByTestId("upload-gallery")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    expect(screen.getByRole("button", { name: "ক্যামেরা দিয়ে তুলুন" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "গ্যালারি থেকে নিন" })).toBeInTheDocument();
  });

  it("works for documents: one button, no camera, no compression", async () => {
    const onUploaded = vi.fn();
    render(
      <FileUpload
        label="ফরম"
        upload={okUploader()}
        onUploaded={onUploaded}
        accept={["application/pdf"]}
      />,
    );
    expect(screen.queryByTestId("upload-camera")).toBeNull();
    expect(screen.getByRole("button", { name: "ফাইল বেছে নিন" })).toBeInTheDocument();
    pick("upload-gallery", file("form.pdf", "application/pdf"));
    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    expect(image.compressImage).not.toHaveBeenCalled();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("FileUpload failure, retry and cancel", () => {
  it("shows a translated error on failure and retries with the same file", async () => {
    const upload = vi
      .fn<Uploader>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ path: "ok" });
    const onUploaded = vi.fn();
    render(<FileUpload label="লোগো" upload={upload} onUploaded={onUploaded} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg"));
    expect(await screen.findByTestId("upload-error")).toHaveTextContent("আপলোড করা যায়নি।");
    expect(screen.queryByText(/network down/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "আবার চেষ্টা করুন" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledOnce());
    expect(upload).toHaveBeenCalledTimes(2);
    expect(image.compressImage).toHaveBeenCalledOnce();
  });

  it("cancels an upload in progress", async () => {
    const upload: Uploader = (_b, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted"))),
      );
    const onUploaded = vi.fn();
    render(<FileUpload label="লোগো" upload={upload} onUploaded={onUploaded} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg"));
    fireEvent.click(await screen.findByRole("button", { name: "বাতিল" }));
    expect(await screen.findByText("আপলোড বাতিল করা হয়েছে")).toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("shows a decode error when the photo cannot be opened", async () => {
    const { ImageDecodeError } = await import("./image");
    image.compressImage.mockRejectedValueOnce(new ImageDecodeError());
    render(<FileUpload label="লোগো" upload={okUploader()} onUploaded={vi.fn()} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg"));
    expect(await screen.findByTestId("upload-error")).toHaveTextContent("ছবিটি খোলা যায়নি");
  });

  it("disables the buttons while an upload runs", async () => {
    const upload: Uploader = () => new Promise(() => undefined);
    render(<FileUpload label="লোগো" upload={upload} onUploaded={vi.fn()} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg"));
    await screen.findByRole("progressbar");
    expect(screen.getByRole("button", { name: "গ্যালারি থেকে নিন" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("FileUpload crop step", () => {
  it("opens the cropper for photos, uploads the cropped blob and does not compress it again", async () => {
    const upload = okUploader();
    const onUploaded = vi.fn();
    render(<FileUpload label="লোগো" upload={upload} onUploaded={onUploaded} cropAspect={1} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg", 5000));
    expect(screen.getByRole("dialog", { name: "crop" })).toHaveAttribute("data-aspect", "1");
    expect(upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "confirm-crop" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledOnce());
    expect(image.compressImage).not.toHaveBeenCalled();
    const blob = onUploaded.mock.calls[0]![1] as Blob;
    expect(blob.size).toBe("cropped".length);
  });

  it("returns to idle when the crop is cancelled", () => {
    render(<FileUpload label="লোগো" upload={okUploader()} onUploaded={vi.fn()} cropAspect={1} />);
    pick("upload-gallery", file("a.jpg", "image/jpeg"));
    fireEvent.click(screen.getByRole("button", { name: "cancel-crop" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("still validates before cropping", () => {
    render(<FileUpload label="লোগো" upload={okUploader()} onUploaded={vi.fn()} cropAspect={1} />);
    pick("upload-gallery", file("a.pdf", "application/pdf"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("upload-error")).toBeInTheDocument();
  });
});
