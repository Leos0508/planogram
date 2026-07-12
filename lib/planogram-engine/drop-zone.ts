import { SHELF_DROP_LINE_INSET_MM } from "./constant";
import type { PointMm, ShelfLayout } from "./types";

function spansOverlap(
  aTop: number,
  aBottom: number,
  bTop: number,
  bBottom: number,
): boolean {
  return aTop <= bBottom && aBottom >= bTop;
}

/**
 * Shelf hit-test: pointer Y span (± half SKU height) must overlap the shelf
 * content band. X is unconstrained. Cursor and ghost position often differ
 * during drag, so we probe a vertical span instead of a single point.
 */
export function resolveShelfForDrop(
  pointer: PointMm,
  skuHeightMm: number,
  shelves: ShelfLayout[],
  topClearanceMm: number,
): ShelfLayout | null {
  const halfHeight = skuHeightMm / 2;
  const probeTop = pointer.y - halfHeight;
  const probeBottom = pointer.y + halfHeight;

  for (const shelf of shelves) {
    const contentTopMm = shelf.rowTopMm + topClearanceMm;
    const contentBottomMm = shelf.yMm - SHELF_DROP_LINE_INSET_MM;

    if (contentBottomMm <= contentTopMm) {
      continue;
    }

    if (
      spansOverlap(probeTop, probeBottom, contentTopMm, contentBottomMm)
    ) {
      return shelf;
    }
  }

  return null;
}
