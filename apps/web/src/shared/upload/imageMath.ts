/** Scales `width x height` down to fit inside `max` on the longer side. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface CropState {
  /** Width divided by height of the crop frame, e.g. 1 for a square logo. */
  aspect: number;
  /** 1 shows the largest possible frame; 3 shows a third of that width. */
  zoom: number;
  /** -1 (far left) to 1 (far right); 0 is centred. */
  offsetX: number;
  /** -1 (top) to 1 (bottom); 0 is centred. */
  offsetY: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The part of the image (in source pixels) that the crop frame shows. At zoom 1 the frame is the
 * largest rectangle of the wanted aspect that fits in the image; zooming shrinks it, and the
 * offsets slide it inside the image without ever leaving it.
 */
export function computeCropRect(imageWidth: number, imageHeight: number, state: CropState): Rect {
  const zoom = Math.max(1, state.zoom);
  const baseWidth = Math.min(imageWidth, imageHeight * state.aspect);
  const width = baseWidth / zoom;
  const height = width / state.aspect;
  const x = ((imageWidth - width) * (clamp(state.offsetX, -1, 1) + 1)) / 2;
  const y = ((imageHeight - height) * (clamp(state.offsetY, -1, 1) + 1)) / 2;
  return { x, y, width, height };
}

/** Converts a drag of `dx` and `dy` screen pixels over a frame `frameWidth` wide into new offsets. */
export function dragOffsets(
  state: CropState,
  dx: number,
  dy: number,
  frameWidth: number,
  imageWidth: number,
  imageHeight: number,
): Pick<CropState, "offsetX" | "offsetY"> {
  const rect = computeCropRect(imageWidth, imageHeight, state);
  const pixelsPerScreenPixel = rect.width / frameWidth;
  const rangeX = imageWidth - rect.width;
  const rangeY = imageHeight - rect.height;
  // Dragging the picture right moves the frame left over it, so the signs are negative.
  const offsetX = rangeX > 0 ? state.offsetX - (dx * pixelsPerScreenPixel * 2) / rangeX : 0;
  const offsetY = rangeY > 0 ? state.offsetY - (dy * pixelsPerScreenPixel * 2) / rangeY : 0;
  return { offsetX: clamp(offsetX, -1, 1), offsetY: clamp(offsetY, -1, 1) };
}
