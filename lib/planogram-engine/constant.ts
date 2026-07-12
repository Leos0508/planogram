/** Default render scale: 1 mm → 0.5 px (tune for editor zoom). */
export const PX_PER_MM = 0.5;

/** Minimum item-area height per shelf row (50cm) — keeps drag bands separated. */
export const MIN_SHELF_CONTENT_HEIGHT_MM = 500;

/** Minimum shelf width when the planogram has no items yet. */
export const MIN_SHELF_WIDTH_MM = 200;

/** Space reserved for shelf labels on the left of the canvas. */
export const CANVAS_LABEL_PADDING_PX = 72;

/** Small buffer above the shelf line where drops are ignored (mm). */
export const SHELF_DROP_LINE_INSET_MM = 8;

/** Max px distance to snap candidate edges to sibling items (screen space). */
export const SNAP_THRESHOLD_PX = 16;

/** Max shelf-wide stack tier (0 = base row). */
export const MAX_STACK_INDEX = 9;

export function mmToPx(mm: number, scale = PX_PER_MM) {
  return mm * scale;
}

export function pxToMm(px: number, scale = PX_PER_MM) {
  return px / scale;
}

/** Snap threshold in planogram mm for a given viewport zoom scale. */
export function snapThresholdMm(viewportScale: number): number {
  const scale = Math.max(viewportScale, 0.01);
  return pxToMm(SNAP_THRESHOLD_PX, PX_PER_MM * scale);
}

/** @deprecated Use snapThresholdMm(viewportScale) for zoom-aware snapping. */
export const SNAP_THRESHOLD_MM = pxToMm(SNAP_THRESHOLD_PX);
