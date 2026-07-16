import {
  computePlanogramLayout,
  type LayoutPreviewItem,
} from "./layout";
import type { PlanogramLayout, PlanogramState } from "./types";

let cache: { key: string; layout: PlanogramLayout } | null = null;

function layoutCacheKey(
  state: PlanogramState,
  preview?: LayoutPreviewItem,
): string {
  return JSON.stringify({
    config: state.config,
    shelves: state.shelves.map((shelf) => ({
      id: shelf.id,
      index: shelf.index,
      minContentHeightMm: shelf.minContentHeightMm,
      minContentWidthMm: shelf.minContentWidthMm,
      items: shelf.items.map((item) => ({
        id: item.id,
        shelfId: item.shelfId,
        x: item.x,
        width: item.width,
        height: item.height,
        y: item.y,
        facingsWide: item.facingsWide,
      })),
    })),
    preview: preview ?? null,
  });
}

export function computePlanogramLayoutCached(
  state: PlanogramState,
  previewItem?: LayoutPreviewItem,
): PlanogramLayout {
  const key = layoutCacheKey(state, previewItem);
  if (cache?.key === key) {
    return cache.layout;
  }

  const layout = computePlanogramLayout(state, previewItem);
  cache = { key, layout };
  return layout;
}

export function invalidatePlanogramLayoutCache() {
  cache = null;
}
