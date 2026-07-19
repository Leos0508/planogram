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
import {
  snapXToShelfItemsDetailed,
  snapYToShelfItemsDetailed,
} from "./snap";
import type {
  AlignmentGuide,
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

type CandidateBuild = {
  candidate: LayoutPreviewItem;
  guides: AlignmentGuide[];
};

function buildCandidate(
  shelfId: string,
  shelfYMm: number,
  pointer: PointMm,
  input: ProjectDropInput,
  shelves: PlanogramShelf[],
  stackGap: number,
): CandidateBuild {
  const facingsWide = input.facingsWide ?? DEFAULT_FACINGS_WIDE;
  const id = previewItemId({ id: input.excludeItemId });
  const footprintWidth = input.sku.width * facingsWide;
  const rawX = Math.max(0, pointer.x - footprintWidth / 2);
  const threshold = snapThresholdMm(input.viewportScale ?? 1);

  const shelf = shelves.find((s) => s.id === shelfId);
  const siblings =
    shelf?.items.filter((item) => item.id !== id) ?? [];

  const snapX = snapXToShelfItemsDetailed(
    rawX,
    footprintWidth,
    siblings,
    threshold,
  );

  const rawBottomY = Math.max(0, shelfYMm - pointer.y - input.sku.height / 2);

  let snappedY: number;
  let guideLocalYMm: number | null = null;

  if (input.forceFloat) {
    snappedY = rawBottomY;
  } else if (input.y !== undefined) {
    snappedY = input.y;
  } else {
    const snapY = snapYToShelfItemsDetailed(
      rawBottomY,
      {
        x: snapX.x,
        width: input.sku.width,
        height: input.sku.height,
        facingsWide,
      },
      siblings,
      stackGap,
      threshold,
    );
    snappedY = snapY.y;
    guideLocalYMm = snapY.guideLocalYMm;
  }

  const guides: AlignmentGuide[] = [];
  if (snapX.guideXMm !== null) {
    guides.push({ orientation: "vertical", positionMm: snapX.guideXMm });
  }
  if (guideLocalYMm !== null) {
    // Contact plane in absolute planogram mm (shelf line − local bottom).
    guides.push({
      orientation: "horizontal",
      positionMm: shelfYMm - guideLocalYMm,
    });
  }

  return {
    candidate: {
      id,
      shelfId,
      skuId: "",
      x: snapX.x,
      width: input.sku.width,
      height: input.sku.height,
      y: snappedY,
      facingsWide,
    },
    guides,
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

  const { candidate, guides } = buildCandidate(
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
      guides,
    };
  }

  return {
    ok: true,
    shelfId: candidate.shelfId,
    x: candidate.x,
    y: candidate.y,
    previewRect,
    guides,
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
