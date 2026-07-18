import { describe, expect, it } from "vitest";
import type { PlanogramLayout, PlanogramState } from "@/lib/planogram-engine/types";
import { renderPlanogramExportHtml } from "@/lib/planogram-export/render-export-html";

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
          facingsWide: 2,
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
      rect: { x: 0, y: 386, width: 132, height: 122 },
    },
  ],
};

describe("renderPlanogramExportHtml", () => {
  it("includes visual, shelf specs, and SKU list with image when present", () => {
    const html = renderPlanogramExportHtml({
      layout,
      state,
      planogramName: "Demo Bay",
      skuById: new Map([
        [
          "sku-1",
          {
            id: "sku-1",
            name: "Standard can 355 ml",
            sku: "CAN-355",
            width: 66,
            height: 122,
            imageUrl: "https://example.com/can.png",
          },
        ],
      ]),
    });

    expect(html).toContain("Demo Bay");
    expect(html).toContain("<svg");
    expect(html).toContain("Shelf specs");
    expect(html).toContain("SKU list");
    expect(html).toContain("CAN-355");
    expect(html).toContain("66 × 122");
    expect(html).toContain('src="https://example.com/can.png"');
    expect(html).toContain(">2</td>");
  });

  it("shows empty SKU message when nothing is placed", () => {
    const emptyState: PlanogramState = {
      ...state,
      shelves: [{ ...state.shelves[0], items: [] }],
    };
    const emptyLayout: PlanogramLayout = { ...layout, items: [] };

    const html = renderPlanogramExportHtml({
      layout: emptyLayout,
      state: emptyState,
      planogramName: "Empty",
      skuById: new Map(),
    });

    expect(html).toContain("No SKUs placed on this planogram.");
  });
});
