import { describe, expect, it } from "vitest";
import type { PlanogramLayout, PlanogramState } from "@/lib/planogram-engine/types";
import { renderPlanogramSvg } from "@/lib/planogram-export/render-svg";

const state: PlanogramState = {
  id: "p1",
  config: { topClearance: 8, stackGap: 2 },
  shelves: [
    {
      id: "s1",
      index: 0,
      minContentHeightMm: 500,
      minContentWidthMm: 900,
      yMm: 508,
      items: [
        {
          id: "i1",
          shelfId: "s1",
          skuId: "sku-1",
          x: 0,
          y: 0,
          width: 66,
          height: 122,
          facingsWide: 1,
        },
      ],
    },
  ],
};

const layout: PlanogramLayout = {
  contentWidthMm: 900,
  bounds: { x: 0, y: 0, width: 900, height: 508 },
  shelves: [
    {
      shelfId: "s1",
      index: 0,
      yMm: 508,
      rowTopMm: 0,
      contentHeightMm: 500,
      rowHeightMm: 508,
    },
  ],
  items: [
    {
      itemId: "i1",
      shelfId: "s1",
      skuId: "sku-1",
      y: 386,
      valid: true,
      rect: { x: 0, y: 386, width: 66, height: 122 },
    },
  ],
};

describe("renderPlanogramSvg", () => {
  it("fills no-image items with the SKU color", () => {
    const svg = renderPlanogramSvg({
      layout,
      state,
      planogramName: "Color Bay",
      skuById: new Map([
        [
          "sku-1",
          {
            name: "Standard can 355 ml",
            color: "#22c55e",
            imageUrl: null,
          },
        ],
      ]),
    });

    expect(svg).toContain('fill="#22c55e"');
    expect(svg).not.toContain("<image ");
  });

  it("keeps default underlay when an image is present", () => {
    const svg = renderPlanogramSvg({
      layout,
      state,
      planogramName: "Image Bay",
      skuById: new Map([
        [
          "sku-1",
          {
            name: "Standard can 355 ml",
            color: "#22c55e",
            imageUrl: "https://example.com/can.png",
          },
        ],
      ]),
    });

    expect(svg).toContain('fill="#dbeafe"');
    expect(svg).toContain('href="https://example.com/can.png"');
  });
});
