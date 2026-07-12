import { describe, expect, it } from "vitest";
import { computePlanogramLayout, computeShelfPositions } from "../layout";
import type { PlanogramState } from "../types";

function baseState(items: PlanogramState["shelves"][number]["items"] = []) {
  return {
    id: "p1",
    config: { topClearance: 100, stackGap: 10 },
    shelves: [
      {
        id: "s1",
        index: 0,
        yMm: 0,
        items,
      },
    ],
  } satisfies PlanogramState;
}

describe("computePlanogramLayout", () => {
  it("uses minimum shelf width when empty", () => {
    const layout = computePlanogramLayout(baseState());
    expect(layout.contentWidthMm).toBe(200);
  });

  it("expands width to fit rightmost item", () => {
    const layout = computePlanogramLayout(
      baseState([
        {
          id: "i1",
          shelfId: "s1",
          skuId: "sku1",
          x: 100,
          width: 300,
          height: 200,
          stackIndex: 0,
          facingsWide: 1,
        },
      ]),
    );
    expect(layout.contentWidthMm).toBe(400);
  });

  it("includes preview item in content width", () => {
    const layout = computePlanogramLayout(baseState(), {
      shelfId: "s1",
      skuId: "sku2",
      x: 250,
      width: 200,
      height: 150,
      stackIndex: 0,
      facingsWide: 1,
    });
    expect(layout.contentWidthMm).toBe(450);
  });

  it("expands width for multi-facing items", () => {
    const layout = computePlanogramLayout(
      baseState([
        {
          id: "i1",
          shelfId: "s1",
          skuId: "sku1",
          x: 0,
          width: 100,
          height: 200,
          stackIndex: 0,
          facingsWide: 3,
        },
      ]),
    );
    expect(layout.contentWidthMm).toBe(300);
  });

  it("assigns increasing shelf y positions", () => {
    const layout = computePlanogramLayout({
      id: "p1",
      config: { topClearance: 100, stackGap: 10 },
      shelves: [
        { id: "s1", index: 0, yMm: 0, items: [] },
        { id: "s2", index: 1, yMm: 0, items: [] },
      ],
    });

    expect(layout.shelves[0].yMm).toBeLessThan(layout.shelves[1].yMm);
  });
});

describe("computeShelfPositions", () => {
  it("places first shelf line after clearance and min content height", () => {
    const positioned = computeShelfPositions(
      [{ id: "s1", index: 0, yMm: 0, items: [] }],
      { topClearance: 100, stackGap: 10 },
    );
    expect(positioned[0].yMm).toBe(600);
  });

  it("uses stacked item heights when computing shelf line", () => {
    const positioned = computeShelfPositions(
      [
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
              height: 400,
              stackIndex: 0,
              facingsWide: 1,
            },
            {
              id: "i2",
              shelfId: "s1",
              skuId: "sku1",
              x: 0,
              width: 100,
              height: 300,
              stackIndex: 1,
              facingsWide: 1,
            },
          ],
        },
      ],
      { topClearance: 100, stackGap: 10 },
    );

    expect(positioned[0].yMm).toBe(820);
  });
});
