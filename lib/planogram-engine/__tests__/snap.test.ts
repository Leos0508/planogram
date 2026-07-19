import { describe, expect, it } from "vitest";
import {
  snapXToShelfItems,
  snapXToShelfItemsDetailed,
  snapYToShelfItemsDetailed,
} from "../snap";

describe("snapXToShelfItems", () => {
  it("returns raw x when there are no siblings", () => {
    expect(snapXToShelfItems(100, 50, [], 20)).toBe(100);
  });

  it("snaps left edge to sibling right edge", () => {
    const others = [{ x: 0, width: 100, facingsWide: 1 }];
    expect(snapXToShelfItems(98, 50, others, 20)).toBe(100);
  });

  it("snaps right edge to sibling left edge", () => {
    const others = [{ x: 200, width: 50, facingsWide: 1 }];
    expect(snapXToShelfItems(155, 50, others, 20)).toBe(150);
  });

  it("picks the closest snap target deterministically", () => {
    const others = [
      { x: 0, width: 100, facingsWide: 1 },
      { x: 300, width: 50, facingsWide: 1 },
    ];
    expect(snapXToShelfItems(102, 50, others, 20)).toBe(100);
  });

  it("does not snap beyond threshold", () => {
    const others = [{ x: 0, width: 100, facingsWide: 1 }];
    expect(snapXToShelfItems(130, 50, others, 20)).toBe(130);
  });

  it("exposes the active vertical guide line when snapped", () => {
    const others = [{ x: 0, width: 100, facingsWide: 1 }];
    const result = snapXToShelfItemsDetailed(98, 50, others, 20);
    expect(result.x).toBe(100);
    expect(result.guideXMm).toBe(100);
  });

  it("clears the vertical guide when outside threshold", () => {
    const others = [{ x: 0, width: 100, facingsWide: 1 }];
    const result = snapXToShelfItemsDetailed(130, 50, others, 20);
    expect(result.x).toBe(130);
    expect(result.guideXMm).toBeNull();
  });
});

describe("snapYToShelfItemsDetailed", () => {
  it("exposes a floor guide when snapping to y = 0", () => {
    const result = snapYToShelfItemsDetailed(
      5,
      { x: 0, width: 50, height: 100, facingsWide: 1 },
      [],
      10,
      20,
    );
    expect(result.y).toBe(0);
    expect(result.guideLocalYMm).toBe(0);
  });

  it("exposes a stack guide when snapping onto an overlapping sibling", () => {
    const result = snapYToShelfItemsDetailed(
      205,
      { x: 0, width: 50, height: 100, facingsWide: 1 },
      [{ x: 0, width: 100, height: 200, y: 0, facingsWide: 1 }],
      10,
      20,
    );
    expect(result.y).toBe(210);
    expect(result.guideLocalYMm).toBe(210);
  });
});
