import { canPlace } from "./placement";
import { itemFootprintWidth } from "./facings";
import { computeContentWidthMm } from "./layout";
import type {
  PlanogramConfig,
  PlanogramItem,
  PlanogramShelf,
} from "./types";

export type ShelfPlacementUpdate = {
  itemId: string;
  x: number;
};

/** Base-row items only (y === 0), sorted left to right. */
export function baseRowItems(items: PlanogramItem[]): PlanogramItem[] {
  return items
    .filter((item) => item.y === 0)
    .sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
}

export function compactShelfRow(items: PlanogramItem[]): ShelfPlacementUpdate[] {
  const row = baseRowItems(items);
  let cursor = 0;

  return row.map((item) => {
    const update = { itemId: item.id, x: cursor };
    cursor += itemFootprintWidth(item);
    return update;
  });
}

export function alignShelfRowRight(
  items: PlanogramItem[],
  shelfWidthMm: number,
): ShelfPlacementUpdate[] {
  const row = baseRowItems(items);
  const totalWidth = row.reduce(
    (sum, item) => sum + itemFootprintWidth(item),
    0,
  );
  let cursor = Math.max(0, shelfWidthMm - totalWidth);

  return row.map((item) => {
    const update = { itemId: item.id, x: cursor };
    cursor += itemFootprintWidth(item);
    return update;
  });
}

export function alignShelfRowCenter(
  items: PlanogramItem[],
  shelfWidthMm: number,
): ShelfPlacementUpdate[] {
  const row = baseRowItems(items);
  const totalWidth = row.reduce(
    (sum, item) => sum + itemFootprintWidth(item),
    0,
  );
  let cursor = Math.max(0, (shelfWidthMm - totalWidth) / 2);

  return row.map((item) => {
    const update = { itemId: item.id, x: cursor };
    cursor += itemFootprintWidth(item);
    return update;
  });
}

/** Distribute items with equal gaps across the shelf width. */
export function distributeShelfRowEvenly(
  items: PlanogramItem[],
  shelfWidthMm: number,
): ShelfPlacementUpdate[] {
  const row = baseRowItems(items);
  if (row.length === 0) return [];

  if (row.length === 1) {
    const item = row[0];
    return [
      {
        itemId: item.id,
        x: Math.max(0, (shelfWidthMm - itemFootprintWidth(item)) / 2),
      },
    ];
  }

  const totalItemWidth = row.reduce(
    (sum, item) => sum + itemFootprintWidth(item),
    0,
  );
  const gap = (shelfWidthMm - totalItemWidth) / (row.length - 1);
  let cursor = 0;

  return row.map((item) => {
    const update = { itemId: item.id, x: cursor };
    cursor += itemFootprintWidth(item) + gap;
    return update;
  });
}

export function shelfContentWidthMm(
  shelves: PlanogramShelf[],
  shelfId: string,
): number {
  const shelf = shelves.find((row) => row.id === shelfId);
  if (!shelf) return 0;
  return computeContentWidthMm([shelf]);
}

export function applyPlacementsToShelves(
  shelves: PlanogramShelf[],
  shelfId: string,
  updates: ShelfPlacementUpdate[],
): PlanogramShelf[] {
  const byId = new Map(updates.map((update) => [update.itemId, update.x]));

  return shelves.map((shelf) => {
    if (shelf.id !== shelfId) return shelf;

    return {
      ...shelf,
      items: shelf.items.map((item) => {
        const x = byId.get(item.id);
        return x !== undefined ? { ...item, x } : item;
      }),
    };
  });
}

export function validateShelfPlacements(
  shelfId: string,
  updates: ShelfPlacementUpdate[],
  shelves: PlanogramShelf[],
  config: PlanogramConfig,
): boolean {
  let working = shelves;

  for (const update of updates) {
    const item = working
      .flatMap((shelf) => shelf.items)
      .find((row) => row.id === update.itemId);
    if (!item) return false;

    const candidate = { ...item, x: update.x, shelfId };
    if (!canPlace(candidate, shelfId, working, config).ok) {
      return false;
    }

    working = applyPlacementsToShelves(working, shelfId, [update]);
  }

  return true;
}

export type ShelfLayoutMode = "compact" | "left" | "right" | "center" | "even";

export function computeShelfLayout(
  mode: ShelfLayoutMode,
  shelf: PlanogramShelf,
  shelves: PlanogramShelf[],
): ShelfPlacementUpdate[] {
  const widthMm = shelfContentWidthMm(shelves, shelf.id);

  switch (mode) {
    case "compact":
    case "left":
      return compactShelfRow(shelf.items);
    case "right":
      return alignShelfRowRight(shelf.items, widthMm);
    case "center":
      return alignShelfRowCenter(shelf.items, widthMm);
    case "even":
      return distributeShelfRowEvenly(shelf.items, widthMm);
  }
}
