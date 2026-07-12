import { describe, expect, it } from "vitest";
import { snapXToShelfItems } from "../snap";

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
});
