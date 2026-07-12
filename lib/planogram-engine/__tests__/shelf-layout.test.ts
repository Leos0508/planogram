import { describe, expect, it } from "vitest";
import {
  alignShelfRowCenter,
  alignShelfRowRight,
  compactShelfRow,
  distributeShelfRowEvenly,
} from "../shelf-helpers";
import type { PlanogramItem } from "../types";

function item(
  id: string,
  x: number,
  width: number,
  facingsWide = 1,
): PlanogramItem {
  return {
    id,
    shelfId: "s1",
    skuId: "sku1",
    x,
    width,
    height: 200,
    stackIndex: 0,
    facingsWide,
  };
}

describe("shelf helpers", () => {
  it("compacts items from the left edge", () => {
    const updates = compactShelfRow([item("a", 50, 100), item("b", 200, 100)]);
    expect(updates).toEqual([
      { itemId: "a", x: 0 },
      { itemId: "b", x: 100 },
    ]);
  });

  it("aligns items to the right edge", () => {
    const updates = alignShelfRowRight(
      [item("a", 0, 100), item("b", 120, 100)],
      400,
    );
    expect(updates).toEqual([
      { itemId: "a", x: 200 },
      { itemId: "b", x: 300 },
    ]);
  });

  it("centers a row within the shelf width", () => {
    const updates = alignShelfRowCenter([item("a", 0, 100)], 400);
    expect(updates).toEqual([{ itemId: "a", x: 150 }]);
  });

  it("distributes items with equal gaps", () => {
    const updates = distributeShelfRowEvenly(
      [item("a", 0, 100), item("b", 200, 100)],
      400,
    );
    expect(updates).toEqual([
      { itemId: "a", x: 0 },
      { itemId: "b", x: 300 },
    ]);
  });

  it("accounts for multi-facing footprint width", () => {
    const updates = compactShelfRow([
      item("a", 0, 100, 2),
      item("b", 300, 100, 1),
    ]);
    expect(updates).toEqual([
      { itemId: "a", x: 0 },
      { itemId: "b", x: 200 },
    ]);
  });
});
