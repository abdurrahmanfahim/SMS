import { Button } from "@sms/ui";
import { Camera, CircleAlert, CircleCheck, Image as ImageIcon, Paperclip } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatNumber } from "../format";
import { useT } from "../i18n";

import { type CompressOptions, ImageDecodeError, compressImage } from "./image";
import { ImageCropper } from "./ImageCropper";
import { type UploadResult, type Uploader, UploadAbortedError, safeFileName } from "./uploader";
import { IMAGE_TYPES, typeLabels, validateFile } from "./validate";

const MB = 1024 * 1024;

export interface FileUploadProps {
  /** Visible label for the whole control (translated). */
  label: string;
  /** Sends the final blob to storage. See `createSupabaseXhrUploader` and `createSdkUploader`. */
  upload: Uploader;
  onUploaded: (result: UploadResult, blob: Blob) => void;
  /** Allowed MIME types. Default: JPG, PNG and WebP photos. */
  accept?: readonly string[];
  /** Largest file the person may pick, in bytes. Default 15 MB for photos, 10 MB otherwise. */
  maxBytes?: number;
  /** Largest size after compression, in bytes. Default: `maxBytes`. */
  maxUploadBytes?: number;
  /** Opens a crop step with this frame shape (width / height). Photos only. */
  cropAspect?: number;
  /** Photo compression on the device. `false` uploads the photo as picked. Default `{}` (1600 px, quality 0.8). */
  compress?: false | CompressOptions;
  /** Which camera the "Take a photo" button asks for. Default the back camera. */
  capture?: "environment" | "user";
  /** File name to store under; default is the picked file's name. */
  fileName?: (picked: File) => string;
  disabled?: boolean;
}

type Phase =
  | { kind: "idle" }
  | { kind: "cropping"; file: File }
  | { kind: "preparing"; name: string }
  | { kind: "uploading"; name: string; progress: number }
  | { kind: "done"; name: string }
  | { kind: "cancelled" }
  | { kind: "error"; code: "type" | "size" | "empty" | "failed" | "decode"; retry?: () => void };

function bytesLabel(bytes: number): string {
  return bytes >= MB
    ? formatNumber(Math.round((bytes / MB) * 10) / 10, { style: "unit", unit: "megabyte" })
    : formatNumber(Math.round(bytes / 1024), { style: "unit", unit: "kilobyte" });
}

/**
 * Photo and file upload for phones: take a photo with the camera or pick from the gallery or file
 * manager, optionally crop, compress on the device, then upload with progress, cancel and retry.
 * Files are checked for type and size before anything is read, with translated messages.
 */
export function FileUpload(props: FileUploadProps) {
  const {
    label,
    upload,
    onUploaded,
    accept = IMAGE_TYPES,
    cropAspect,
    compress = {},
    capture = "environment",
    fileName,
    disabled = false,
  } = props;
  const isImage = accept.every((type) => type.startsWith("image/"));
  const maxBytes = props.maxBytes ?? (isImage ? 15 * MB : 10 * MB);
  const maxUploadBytes = props.maxUploadBytes ?? maxBytes;
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // "Try again" runs later than the render that showed the error. It must use the newest `upload`
  // and `onUploaded` the parent passed, not the ones captured when the upload first failed.
  const latest = useRef({ upload, onUploaded });
  latest.current = { upload, onUploaded };
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const showPreview = useCallback((blob: Blob | null) => {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return blob ? URL.createObjectURL(blob) : null;
    });
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
    },
    [],
  );

  const send = useCallback(async (blob: Blob, name: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "uploading", name, progress: 0 });
    try {
      const result = await latest.current.upload(blob, {
        fileName: name,
        signal: controller.signal,
        onProgress: (fraction) =>
          setPhase((p) =>
            p.kind === "uploading" ? { ...p, progress: Math.min(1, Math.max(0, fraction)) } : p,
          ),
      });
      setPhase({ kind: "done", name });
      latest.current.onUploaded(result, blob);
    } catch (error) {
      if (error instanceof UploadAbortedError || controller.signal.aborted) {
        setPhase({ kind: "cancelled" });
      } else {
        setPhase({ kind: "error", code: "failed", retry: () => void send(blob, name) });
      }
    }
  }, []);

  const prepare = useCallback(
    async (blob: Blob, picked: File, alreadyCropped: boolean) => {
      const name = safeFileName(
        fileName ? fileName(picked) : picked.name,
        isImage ? "photo.jpg" : "file",
      );
      let outgoing = blob;
      if (isImage && compress !== false && !alreadyCropped) {
        setPhase({ kind: "preparing", name });
        try {
          outgoing = await compressImage(blob, compress);
        } catch (error) {
          setPhase({
            kind: "error",
            code: error instanceof ImageDecodeError ? "decode" : "failed",
          });
          return;
        }
      }
      if (outgoing.size > maxUploadBytes) {
        setPhase({ kind: "error", code: "size" });
        return;
      }
      if (isImage) showPreview(outgoing);
      await send(outgoing, name);
    },
    [compress, fileName, isImage, maxUploadBytes, send, showPreview],
  );

  function onPicked(files: FileList | null) {
    const picked = files?.[0];
    if (!picked) return;
    const result = validateFile(picked, { accept, maxBytes });
    if (!result.ok) {
      setPhase({ kind: "error", code: result.code });
      return;
    }
    if (isImage && cropAspect) {
      setPhase({ kind: "cropping", file: picked });
      return;
    }
    void prepare(picked, picked, false);
  }

  const busy = phase.kind === "preparing" || phase.kind === "uploading";
  const inputAccept = accept.join(",");
  const trigger = (ref: React.RefObject<HTMLInputElement | null>) => () => ref.current?.click();
  const input = (
    ref: React.RefObject<HTMLInputElement | null>,
    testId: string,
    withCapture: boolean,
  ) => (
    <input
      ref={ref}
      type="file"
      accept={inputAccept}
      capture={withCapture ? capture : undefined}
      className="hidden"
      tabIndex={-1}
      data-testid={testId}
      onChange={(e) => {
        onPicked(e.target.files);
        e.target.value = "";
      }}
    />
  );

  const cropFile = phase.kind === "cropping" ? phase.file : null;

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-line p-4"
      data-testid="file-upload"
    >
      <p className="m-0 font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={t("upload.preview.alt")}
            className="h-24 w-24 rounded-md border border-line object-cover"
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          {isImage ? (
            <>
              <Button
                variant="secondary"
                disabled={disabled || busy}
                leadingIcon={<Camera aria-hidden className="h-5 w-5" />}
                onClick={trigger(cameraRef)}
              >
                {t("upload.action.camera")}
              </Button>
              <Button
                variant="secondary"
                disabled={disabled || busy}
                leadingIcon={<ImageIcon aria-hidden className="h-5 w-5" />}
                onClick={trigger(galleryRef)}
              >
                {t("upload.action.gallery")}
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              disabled={disabled || busy}
              leadingIcon={<Paperclip aria-hidden className="h-5 w-5" />}
              onClick={trigger(galleryRef)}
            >
              {phase.kind === "done" ? t("upload.action.replace") : t("upload.action.file")}
            </Button>
          )}
        </div>
      </div>
      {isImage ? input(cameraRef, "upload-camera", true) : null}
      {input(galleryRef, "upload-gallery", false)}

      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        {phase.kind === "preparing" ? <p className="m-0">{t("upload.state.preparing")}</p> : null}
        {phase.kind === "uploading" ? (
          <>
            <p className="m-0">
              {t("upload.state.uploading", {
                percent: formatNumber(phase.progress, {
                  style: "percent",
                  maximumFractionDigits: 0,
                }),
              })}
            </p>
            <div
              role="progressbar"
              aria-label={t("upload.state.progress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(phase.progress * 100)}
              className="h-3 w-full overflow-hidden rounded-full bg-surface-subtle"
            >
              <div className="h-full bg-primary" style={{ width: `${phase.progress * 100}%` }} />
            </div>
            <div>
              <Button variant="secondary" size="sm" onClick={() => abortRef.current?.abort()}>
                {t("common.action.cancel")}
              </Button>
            </div>
          </>
        ) : null}
        {phase.kind === "done" ? (
          <p className="m-0 flex items-center gap-2 font-medium">
            <CircleCheck aria-hidden className="h-5 w-5 text-success" />
            {t("upload.state.done")}
          </p>
        ) : null}
        {phase.kind === "cancelled" ? <p className="m-0">{t("upload.state.cancelled")}</p> : null}
      </div>

      {phase.kind === "error" ? (
        <div role="alert" className="flex flex-col gap-2" data-testid="upload-error">
          <p className="m-0 flex items-start gap-2 font-medium text-danger">
            <CircleAlert aria-hidden className="mt-1 h-5 w-5 shrink-0" />
            <span>
              {phase.code === "type"
                ? t("upload.error.type", { types: typeLabels(accept) })
                : phase.code === "size"
                  ? t("upload.error.size", { size: bytesLabel(maxUploadBytes) })
                  : t(`upload.error.${phase.code}`)}
            </span>
          </p>
          {phase.retry ? (
            <div>
              <Button variant="secondary" onClick={phase.retry}>
                {t("upload.action.retry")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {cropFile && cropAspect ? (
        <ImageCropper
          open
          file={cropFile}
          aspect={cropAspect}
          output={compress === false ? undefined : compress}
          onCancel={() => setPhase({ kind: "idle" })}
          onDecodeError={() => setPhase({ kind: "error", code: "decode" })}
          onConfirm={(blob) => void prepare(blob, cropFile, true)}
        />
      ) : null}
    </div>
  );
}
