import type { PlanogramDetail } from "@/lib/planograms/queries";
import type { PlanogramState } from "./types";

/** Bridge DB/query shape → engine state. */
export function planogramDetailToState(detail: PlanogramDetail): PlanogramState {
  return {
    id: detail.id,
    config: {
      topClearance: detail.topClearance,
      stackGap: detail.stackGap,
    },
    shelves: detail.shelves.map((shelf) => ({
      id: shelf.id,
      index: shelf.index,
      minContentHeightMm: shelf.minContentHeightMm,
      minContentWidthMm: shelf.minContentWidthMm,
      yMm: 0,
      items: shelf.items.map((item) => ({
        id: item.id,
        shelfId: shelf.id,
        skuId: item.skuId,
        x: item.x,
        width: item.width,
        height: item.height,
        y: item.y,
        facingsWide: item.facingsWide,
      })),
    })),
  };
}
