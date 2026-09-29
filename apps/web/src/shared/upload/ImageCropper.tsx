import { Button, Dialog } from "@sms/ui";
import { useEffect, useRef, useState } from "react";

import { useT } from "../i18n";

import { ImageDecodeError, cropImage, decodeImage, drawCrop, type CompressOptions } from "./image";
import { type CropState, dragOffsets } from "./imageMath";

export interface ImageCropperProps {
  open: boolean;
  file: Blob;
  /** Width divided by height of the crop frame. 1 = square. */
  aspect: number;
  output?: CompressOptions;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  onDecodeError: () => void;
}

const PREVIEW_WIDTH = 280;

/**
 * Crop dialog for photos. It works without dragging: a zoom slider and two position sliders move
 * the frame (WCAG 2.5.7), and dragging the preview with a finger is an extra. The preview is a
 * canvas that shows exactly what will be uploaded.
 */
export function ImageCropper({
  open,
  file,
  aspect,
  output,
  onCancel,
  onConfirm,
  onDecodeError,
}: ImageCropperProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [state, setState] = useState<CropState>({ aspect, zoom: 1, offsetX: 0, offsetY: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let decoded: ImageBitmap | null = null;
    setState({ aspect, zoom: 1, offsetX: 0, offsetY: 0 });
    decodeImage(file)
      .then((result) => {
        if (cancelled) return result.close();
        decoded = result;
        setBitmap(result);
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ImageDecodeError) onDecodeError();
      });
    return () => {
      cancelled = true;
      decoded?.close();
      setBitmap(null);
    };
  }, [open, file, aspect, onDecodeError]);

  useEffect(() => {
    if (canvasRef.current && bitmap) drawCrop(canvasRef.current, bitmap, state);
  }, [bitmap, state]);

  const height = Math.round(PREVIEW_WIDTH / aspect);
  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    key: keyof CropState,
  ) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setState((s) => ({ ...s, [key]: Number(e.target.value) }))}
        className="min-h-tap w-full"
      />
    </label>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title={t("upload.crop.title")}
      closeLabel={t("common.action.close")}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.action.cancel")}
          </Button>
          <Button
            loading={busy}
            disabled={!bitmap}
            onClick={async () => {
              if (!bitmap) return;
              setBusy(true);
              try {
                onConfirm(await cropImage(bitmap, state, output));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("upload.crop.confirm")}
          </Button>
        </>
      }
    >
      <canvas
        ref={canvasRef}
        width={PREVIEW_WIDTH}
        height={height}
        role="img"
        aria-label={t("upload.crop.preview")}
        data-testid="crop-preview"
        className="mx-auto max-w-full touch-none rounded-md border border-line"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current || !bitmap) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          const frame = e.currentTarget.getBoundingClientRect().width || PREVIEW_WIDTH;
          setState((s) => ({
            ...s,
            ...dragOffsets(s, dx, dy, frame, bitmap.width, bitmap.height),
          }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      />
      {slider(t("upload.crop.zoom"), state.zoom, 1, 4, 0.05, "zoom")}
      {slider(t("upload.crop.horizontal"), state.offsetX, -1, 1, 0.02, "offsetX")}
      {slider(t("upload.crop.vertical"), state.offsetY, -1, 1, 0.02, "offsetY")}
    </Dialog>
  );
}
