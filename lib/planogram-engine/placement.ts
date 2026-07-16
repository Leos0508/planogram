import {
  computeItemRectOnShelf,
  positionedShelves,
  previewItemId,
  shelfContentBandMm,
  shelfContentBandWidthMm,
} from "./layout";
import { itemFootprintWidth } from "./facings";
import type {
  CanPlaceResult,
  PlanogramConfig,
  PlanogramItem,
  PlanogramShelf,
  RectMm,
} from "./types";

export function rectsOverlap(a: RectMm, b: RectMm): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function canPlace(
  candidate: Omit<PlanogramItem, "id"> & { id?: string },
  shelfId: string,
  shelves: PlanogramShelf[],
  config: PlanogramConfig,
): CanPlaceResult {
  const id = previewItemId(candidate);
  const candidateWithId = { ...candidate, id, shelfId };

  const shelf = shelves.find((s) => s.id === shelfId);
  if (!shelf) {
    return { ok: false, reason: "NO_SHELF" };
  }

  const committedItems = shelf.items.filter((item) => item.id !== id);
  const bandMm = shelfContentBandMm(
    committedItems,
    shelf.minContentHeightMm,
  );
  if (candidateWithId.y + candidateWithId.height > bandMm) {
    return { ok: false, reason: "OUT_OF_BAND" };
  }

  const bandWidthMm = shelfContentBandWidthMm({
    minContentWidthMm: shelf.minContentWidthMm,
    items: committedItems,
  });
  if (
    candidateWithId.x + itemFootprintWidth(candidateWithId) >
    bandWidthMm
  ) {
    return { ok: false, reason: "OUT_OF_BAND" };
  }

  const positioned = positionedShelves(shelves, config, {
    shelfId,
    item: candidateWithId,
  });
  const positionedShelf = positioned.find((s) => s.id === shelfId);
  if (!positionedShelf) {
    return { ok: false, reason: "NO_SHELF" };
  }

  const previewRect = computeItemRectOnShelf(candidateWithId, positionedShelf);

  const collision = shelf.items.some((item) => {
    if (item.id === id) {
      return false;
    }

    const itemRect = computeItemRectOnShelf(item, positionedShelf);

    return rectsOverlap(previewRect, itemRect);
  });

  return collision ? { ok: false, reason: "COLLISION" } : { ok: true };
}
