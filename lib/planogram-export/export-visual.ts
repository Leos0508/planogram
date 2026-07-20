import type {
  PlanogramLayout,
  RectMm,
  ShelfLayout,
} from "@/lib/planogram-engine/types";

/** Above this shelf count, overview uses a tighter fit-to-page scale. */
export const EXPORT_OVERVIEW_SCALE_AFTER = 3;

/** Above this shelf count, also emit detail sections of EXPORT_SECTION_SIZE shelves. */
export const EXPORT_SECTION_AFTER = 8;

export const EXPORT_SECTION_SIZE = 4;

/**
 * Target CSS px for overview fit (@ ~96dpi A4 with margins + header room).
 * Taller fixtures (> EXPORT_OVERVIEW_SCALE_AFTER shelves) use the compact height.
 */
export const EXPORT_OVERVIEW_MAX_WIDTH_PX = 680;
export const EXPORT_OVERVIEW_MAX_HEIGHT_PX = 780;
export const EXPORT_OVERVIEW_COMPACT_MAX_HEIGHT_PX = 640;

/** Detail sections can use more of the page (fewer shelves per SVG). */
export const EXPORT_SECTION_MAX_WIDTH_PX = 680;
export const EXPORT_SECTION_MAX_HEIGHT_PX = 780;

export type ExportSvgFit = {
  maxWidthPx: number;
  maxHeightPx: number;
};

/** Uniform scale ≤ 1 so intrinsic SVG size fits inside max width/height. */
export function exportSvgFitScale(
  widthPx: number,
  heightPx: number,
  fit: ExportSvgFit,
): number {
  if (widthPx <= 0 || heightPx <= 0) return 1;
  return Math.min(1, fit.maxWidthPx / widthPx, fit.maxHeightPx / heightPx);
}

export function overviewExportFit(shelfCount: number): ExportSvgFit {
  return {
    maxWidthPx: EXPORT_OVERVIEW_MAX_WIDTH_PX,
    maxHeightPx:
      shelfCount > EXPORT_OVERVIEW_SCALE_AFTER
        ? EXPORT_OVERVIEW_COMPACT_MAX_HEIGHT_PX
        : EXPORT_OVERVIEW_MAX_HEIGHT_PX,
  };
}

export function sectionExportFit(): ExportSvgFit {
  return {
    maxWidthPx: EXPORT_SECTION_MAX_WIDTH_PX,
    maxHeightPx: EXPORT_SECTION_MAX_HEIGHT_PX,
  };
}

export function chunkShelfLayouts(
  shelves: ShelfLayout[],
  size: number = EXPORT_SECTION_SIZE,
): ShelfLayout[][] {
  if (size <= 0) return [];
  const chunks: ShelfLayout[][] = [];
  for (let i = 0; i < shelves.length; i += size) {
    chunks.push(shelves.slice(i, i + size));
  }
  return chunks;
}

function computeSliceBounds(
  shelfLayouts: ShelfLayout[],
  itemRects: RectMm[],
  contentWidthMm: number,
): RectMm {
  if (shelfLayouts.length === 0) {
    return { x: 0, y: 0, width: contentWidthMm, height: 0 };
  }

  const minRowTop = Math.min(...shelfLayouts.map((shelf) => shelf.rowTopMm));
  const maxShelfY = Math.max(...shelfLayouts.map((shelf) => shelf.yMm));
  const minItemTop =
    itemRects.length > 0
      ? Math.min(...itemRects.map((rect) => rect.y))
      : minRowTop;
  const maxBottom = Math.max(
    maxShelfY,
    ...(itemRects.length > 0
      ? itemRects.map((rect) => rect.y + rect.height)
      : [maxShelfY]),
  );
  const topMm = Math.min(minItemTop, minRowTop);

  return {
    x: 0,
    y: topMm,
    width: contentWidthMm,
    height: maxBottom - topMm,
  };
}

/** Subset of layout for a shelf section; bounds rebased so SVG has no empty lead-in. */
export function slicePlanogramLayout(
  layout: PlanogramLayout,
  shelfIds: ReadonlySet<string>,
): PlanogramLayout {
  const shelves = layout.shelves.filter((shelf) => shelfIds.has(shelf.shelfId));
  const items = layout.items.filter((item) => shelfIds.has(item.shelfId));
  return {
    contentWidthMm: layout.contentWidthMm,
    shelves,
    items,
    bounds: computeSliceBounds(
      shelves,
      items.map((item) => item.rect),
      layout.contentWidthMm,
    ),
  };
}

export function shelfSectionLabel(shelves: ShelfLayout[]): string {
  if (shelves.length === 0) return "Shelves";
  const first = shelves[0].index + 1;
  const last = shelves[shelves.length - 1].index + 1;
  if (first === last) return `Shelf ${first}`;
  return `Shelves ${first}–${last}`;
}
