import { type CropState, type Rect, computeCropRect, fitWithin } from "./imageMath";

/** Thrown when the browser cannot decode the picked file as an image. */
export class ImageDecodeError extends Error {
  constructor() {
    super("image decode failed");
    this.name = "ImageDecodeError";
  }
}

export interface CompressOptions {
  /** Longest side in pixels after resizing. Default 1600. */
  maxDimension?: number;
  /** JPEG or WebP quality from 0 to 1. Default 0.8. */
  quality?: number;
  /** Output type. Default `image/jpeg`. */
  type?: "image/jpeg" | "image/webp";
}

/** Decodes an image file, applying its EXIF rotation (phone photos are often stored sideways). */
export async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageDecodeError();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      type,
      quality,
    ),
  );
}

/**
 * Resizes and re-encodes a photo on the device so a 6 MB camera picture becomes a few hundred KB
 * before it uses mobile data. Returns the original when re-encoding would not make it smaller.
 */
export async function compressImage(file: Blob, options: CompressOptions = {}): Promise<Blob> {
  const { maxDimension = 1600, quality = 0.8, type = "image/jpeg" } = options;
  const bitmap = await decodeImage(file);
  try {
    const size = fitWithin(bitmap.width, bitmap.height, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    // A white base keeps transparent PNGs from turning black in JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const output = await toBlob(canvas, type, quality);
    const unchangedSize = size.width === bitmap.width && size.height === bitmap.height;
    return unchangedSize && output.size >= file.size ? file : output;
  } finally {
    bitmap.close();
  }
}

/** Draws the crop frame's part of the image onto `canvas` (used for the live preview). */
export function drawCrop(canvas: HTMLCanvasElement, bitmap: ImageBitmap, state: CropState): Rect {
  const rect = computeCropRect(bitmap.width, bitmap.height, state);
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      bitmap,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }
  return rect;
}

/** Cuts the chosen part out of the photo and encodes it, already scaled down. */
export async function cropImage(
  bitmap: ImageBitmap,
  state: CropState,
  options: CompressOptions = {},
): Promise<Blob> {
  const { maxDimension = 1600, quality = 0.85, type = "image/jpeg" } = options;
  const rect = computeCropRect(bitmap.width, bitmap.height, state);
  const size = fitWithin(Math.round(rect.width), Math.round(rect.height), maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, size.width, size.height);
  return toBlob(canvas, type, quality);
}
