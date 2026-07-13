import { snapThresholdMm } from "./constant";
import { toPlanogramMm } from "./coords";
import { DEFAULT_FACINGS_WIDE } from "./facings";
import { resolveShelfForDrop } from "./drop-zone";
import {
  computeItemRectOnShelf,
  positionedShelves,
  previewItemId,
  type LayoutPreviewItem,
} from "./layout";
import { computePlanogramLayoutCached } from "./layout-cache";
import { canPlace } from "./placement";
import { snapXToShelfItems, snapYToShelfItems } from "./snap";
import type {
  DropProjection,
  PlanogramShelf,
  PlanogramState,
  PointMm,
} from "./types";

export type ProjectDropInput = {
  pointerMm: PointMm;
  sku: { width: number; height: number };
  facingsWide?: number;
  /** Override snapped y (shelf-local bottom, mm). */
  y?: number;
  /** When true, skip Y snap targets (float mode). */
  forceFloat?: boolean;
  /** When moving an existing item, pass its id so collision skips self. */
  excludeItemId?: string;
  /** Viewport zoom scale for screen-space snap threshold. Defaults to 1. */
  viewportScale?: number;
};

function buildCandidate(
  shelfId: string,
  shelfYMm: number,
  pointer: PointMm,
  input: ProjectDropInput,
  shelves: PlanogramShelf[],
  stackGap: number,
): LayoutPreviewItem {
  const facingsWide = input.facingsWide ?? DEFAULT_FACINGS_WIDE;
  const id = previewItemId({ id: input.excludeItemId });
  const footprintWidth = input.sku.width * facingsWide;
  const rawX = Math.max(0, pointer.x - footprintWidth / 2);
  const threshold = snapThresholdMm(input.viewportScale ?? 1);

  const shelf = shelves.find((s) => s.id === shelfId);
  const siblings =
    shelf?.items.filter((item) => item.id !== id) ?? [];

  const snappedX = snapXToShelfItems(
    rawX,
    footprintWidth,
    siblings,
    threshold,
  );

  const rawBottomY = Math.max(0, shelfYMm - pointer.y - input.sku.height / 2);

  const snappedY = input.forceFloat
    ? rawBottomY
    : input.y !== undefined
      ? input.y
      : snapYToShelfItems(
          rawBottomY,
          {
            x: snappedX,
            width: input.sku.width,
            height: input.sku.height,
            facingsWide,
          },
          siblings,
          stackGap,
          threshold,
        );

  return {
    id,
    shelfId,
    skuId: "",
    x: snappedX,
    width: input.sku.width,
    height: input.sku.height,
    y: snappedY,
    facingsWide,
  };
}

/** Map pointer position → shelf + x/y placement (palette drag or item move). */
export function projectDrop(
  state: PlanogramState,
  input: ProjectDropInput,
): DropProjection {
  const layout = computePlanogramLayoutCached(state);
  const pointer = toPlanogramMm(input.pointerMm, layout.bounds.y);

  const shelfLayout = resolveShelfForDrop(
    pointer,
    input.sku.height,
    layout.shelves,
    state.config.topClearance,
  );
  if (!shelfLayout) {
    return { ok: false, reason: "NO_SHELF" };
  }

  const candidate = buildCandidate(
    shelfLayout.shelfId,
    shelfLayout.yMm,
    pointer,
    input,
    state.shelves,
    state.config.stackGap,
  );

  const positioned = positionedShelves(state.shelves, state.config, {
    shelfId: candidate.shelfId,
    item: candidate,
  });
  const shelf = positioned.find((s) => s.id === candidate.shelfId);
  if (!shelf) {
    return { ok: false, reason: "NO_SHELF" };
  }

  const previewRect = computeItemRectOnShelf(candidate, shelf);

  const placement = canPlace(
    candidate,
    candidate.shelfId,
    state.shelves,
    state.config,
  );

  if (!placement.ok) {
    return {
      ok: false,
      reason: placement.reason,
      shelfId: candidate.shelfId,
      x: candidate.x,
      y: candidate.y,
      previewRect,
    };
  }

  return {
    ok: true,
    shelfId: candidate.shelfId,
    x: candidate.x,
    y: candidate.y,
    previewRect,
  };
}

/** Drag for an item already on a shelf (preserves y unless pointer snaps). */
export function projectItemDrag(
  state: PlanogramState,
  itemId: string,
  pointerMm: PointMm,
  viewportScale = 1,
  forceFloat = false,
): DropProjection {
  for (const shelf of state.shelves) {
    const item = shelf.items.find((i) => i.id === itemId);
    if (!item) continue;

    return projectDrop(state, {
      pointerMm,
      sku: { width: item.width, height: item.height },
      facingsWide: item.facingsWide,
      excludeItemId: itemId,
      viewportScale,
      forceFloat,
    });
  }

  return { ok: false, reason: "NO_SHELF" };
}

/** @deprecated Use projectItemDrag */
export function projectHorizontalDrag(
  state: PlanogramState,
  itemId: string,
  pointerMm: PointMm,
  viewportScale = 1,
): DropProjection {
  return projectItemDrag(state, itemId, pointerMm, viewportScale);
}
