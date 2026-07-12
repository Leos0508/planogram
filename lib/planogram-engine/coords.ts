import { PX_PER_MM, pxToMm } from "./constant";
import type { PointMm } from "./types";

export function pointerPxToMm(
  pointer: PointMm,
  scale = PX_PER_MM,
): PointMm {
  return {
    x: pxToMm(pointer.x, scale),
    y: pxToMm(pointer.y, scale),
  };
}

/** Canvas-local mm (origin at bounds top-left) → planogram mm space. */
export function toPlanogramMm(
  pointerMm: PointMm,
  boundsOriginY: number,
): PointMm {
  return {
    x: pointerMm.x,
    y: pointerMm.y + boundsOriginY,
  };
}
