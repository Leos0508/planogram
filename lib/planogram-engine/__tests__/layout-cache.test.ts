import { describe, expect, it } from "vitest";
import { computePlanogramLayoutCached } from "../layout-cache";
import type { PlanogramState } from "../types";

function baseState(): PlanogramState {
  return {
    id: "p1",
    config: { topClearance: 100, stackGap: 10 },
    shelves: [
      {
        id: "s1",
        index: 0,
        yMm: 0,
        items: [
          {
            id: "i1",
            shelfId: "s1",
            skuId: "sku1",
            x: 0,
            width: 100,
            height: 200,
            y: 0,
            facingsWide: 1,
          },
        ],
      },
    ],
  };
}

describe("computePlanogramLayoutCached", () => {
  it("returns the same layout object for repeated calls", () => {
    const state = baseState();
    const first = computePlanogramLayoutCached(state);
    const second = computePlanogramLayoutCached(state);
    expect(first).toBe(second);
  });

  it("recomputes when state changes", () => {
    const state = baseState();
    const first = computePlanogramLayoutCached(state);
    const next = {
      ...state,
      shelves: state.shelves.map((shelf) => ({
        ...shelf,
        items: shelf.items.map((item) => ({ ...item, x: 50 })),
      })),
    };
    const second = computePlanogramLayoutCached(next);
    expect(second).not.toBe(first);
    expect(second.items[0]?.rect.x).toBe(50);
  });
});
