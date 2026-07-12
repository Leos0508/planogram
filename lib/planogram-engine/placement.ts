import {
  computeItemRectOnShelf,
  positionedShelves,
  previewItemId,
} from "./layout";
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

  const positioned = positionedShelves(shelves, config, {
    shelfId,
    item: candidateWithId,
  });
  const shelf = positioned.find((s) => s.id === shelfId);
  if (!shelf) {
    return { ok: false, reason: "NO_SHELF" };
  }

  const previewRect = computeItemRectOnShelf(
    candidateWithId,
    shelf,
    shelf.items,
    config,
  );

  const collision = shelf.items.some((item) => {
    if (item.id === id || item.stackIndex !== candidateWithId.stackIndex) {
      return false;
    }

    return rectsOverlap(
      previewRect,
      computeItemRectOnShelf(item, shelf, shelf.items, config),
    );
  });

  return collision ? { ok: false, reason: "COLLISION" } : { ok: true };
}
