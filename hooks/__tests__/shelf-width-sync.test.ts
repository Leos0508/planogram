import { describe, expect, it } from "vitest";
import { setAllShelvesMinContentWidthInState } from "@/hooks/use-planogram-history";
import { computeContentWidthMm } from "@/lib/planogram-engine";
import type { PlanogramState } from "@/lib/planogram-engine/types";

const baseState: PlanogramState = {
  id: "p1",
  config: { topClearance: 100, stackGap: 10 },
  shelves: [
    {
      id: "s0",
      index: 0,
      minContentHeightMm: 500,
      minContentWidthMm: 200,
      yMm: 0,
      items: [],
    },
    {
      id: "s1",
      index: 1,
      minContentHeightMm: 500,
      minContentWidthMm: 400,
      yMm: 0,
      items: [],
    },
    {
      id: "s2",
      index: 2,
      minContentHeightMm: 500,
      minContentWidthMm: 200,
      yMm: 0,
      items: [],
    },
  ],
};

describe("shared shelf width sync", () => {
  it("shared content width follows the widest shelf min", () => {
    expect(computeContentWidthMm(baseState.shelves)).toBe(400);
  });

  it("setAllShelvesMinContentWidthInState aligns every shelf min", () => {
    const next = setAllShelvesMinContentWidthInState(baseState, 450);
    expect(next.shelves.map((shelf) => shelf.minContentWidthMm)).toEqual([
      450, 450, 450,
    ]);
    expect(computeContentWidthMm(next.shelves)).toBe(450);
  });
});
