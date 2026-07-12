import { canPlace } from "./placement";
import type { PlanogramItem, PlanogramState } from "./types";

export type ItemPlacement = {
  itemId: string;
  shelfId: string;
  x: number;
  stackIndex: number;
};

/** Try to nudge an item horizontally by deltaMm. Returns null if blocked. */
export function nudgeItemX(
  state: PlanogramState,
  itemId: string,
  deltaMm: number,
): ItemPlacement | null {
  for (const shelf of state.shelves) {
    const item = shelf.items.find((row) => row.id === itemId);
    if (!item) continue;

    const nextX = Math.max(0, item.x + deltaMm);
    if (nextX === item.x && deltaMm < 0) return null;

    const candidate: PlanogramItem = {
      ...item,
      x: nextX,
      shelfId: shelf.id,
    };

    const placement = canPlace(
      candidate,
      shelf.id,
      state.shelves,
      state.config,
    );
    if (!placement.ok) return null;

    return {
      itemId: item.id,
      shelfId: shelf.id,
      x: nextX,
      stackIndex: item.stackIndex,
    };
  }

  return null;
}
