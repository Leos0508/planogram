import { describe, expect, it } from "vitest";
import { computePlanogramLayout, computeShelfPositions } from "../layout";
import type { PlanogramState } from "../types";

const DEFAULT_MIN_CONTENT_HEIGHT_MM = 500;

function baseState(items: PlanogramState["shelves"][number]["items"] = []) {
  return {
    id: "p1",
    config: { topClearance: 100, stackGap: 10 },
    shelves: [
      {
        id: "s1",
        index: 0,
        minContentHeightMm: DEFAULT_MIN_CONTENT_HEIGHT_MM,
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
          y: 0,
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
      y: 0,
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
          y: 0,
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
        { id: "s1", index: 0, minContentHeightMm: DEFAULT_MIN_CONTENT_HEIGHT_MM, yMm: 0, items: [] },
        { id: "s2", index: 1, minContentHeightMm: DEFAULT_MIN_CONTENT_HEIGHT_MM, yMm: 0, items: [] },
      ],
    });

    expect(layout.shelves[0].yMm).toBeLessThan(layout.shelves[1].yMm);
  });
});

describe("computeShelfPositions", () => {
  it("places first shelf line after clearance and min content height", () => {
    const positioned = computeShelfPositions(
      [{ id: "s1", index: 0, minContentHeightMm: DEFAULT_MIN_CONTENT_HEIGHT_MM, yMm: 0, items: [] }],
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
          minContentHeightMm: DEFAULT_MIN_CONTENT_HEIGHT_MM,
          yMm: 0,
          items: [
            {
              id: "i1",
              shelfId: "s1",
              skuId: "sku1",
              x: 0,
              width: 100,
              height: 400,
              y: 0,
              facingsWide: 1,
            },
            {
              id: "i2",
              shelfId: "s1",
              skuId: "sku1",
              x: 0,
              width: 100,
              height: 300,
              y: 410,
              facingsWide: 1,
            },
          ],
        },
      ],
      { topClearance: 100, stackGap: 10 },
    );

    expect(positioned[0].yMm).toBe(910);
  });

  it("reserves topClearance above the tallest stacked item", () => {
    const config = { topClearance: 10, stackGap: 10 };
    const items = [
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 400,
        y: 0,
        facingsWide: 1,
      },
      {
        id: "i2",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 300,
        y: 410,
        facingsWide: 1,
      },
    ];
    const state = {
      id: "p1",
      config,
      shelves: [{ id: "s1", index: 0, minContentHeightMm: DEFAULT_MIN_CONTENT_HEIGHT_MM, yMm: 0, items }],
    } satisfies PlanogramState;

    const layout = computePlanogramLayout(state);
    const shelf = layout.shelves[0];
    const tallest = layout.items.find((item) => item.itemId === "i2")!;

    expect(shelf.contentHeightMm).toBe(720);
    expect(tallest.rect.y).toBe(shelf.rowTopMm + config.topClearance * 2);
  });

  it("uses minContentHeightMm when larger than item reach", () => {
    const state = baseState();
    state.shelves[0].minContentHeightMm = 800;

    const layout = computePlanogramLayout(state);
    expect(layout.shelves[0].contentHeightMm).toBe(800);
    expect(layout.shelves[0].yMm).toBe(900);
  });
});
