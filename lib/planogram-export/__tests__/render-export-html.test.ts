import { describe, expect, it } from "vitest";
import { mmToPx } from "@/lib/planogram-engine/constant";
import type { PlanogramLayout, PlanogramState } from "@/lib/planogram-engine/types";
import {
  chunkShelfLayouts,
  EXPORT_OVERVIEW_COMPACT_MAX_HEIGHT_PX,
  EXPORT_SECTION_AFTER,
  EXPORT_SECTION_SIZE,
  exportSvgFitScale,
  overviewExportFit,
  shelfSectionLabel,
  slicePlanogramLayout,
} from "@/lib/planogram-export/export-visual";
import { renderPlanogramExportHtml } from "@/lib/planogram-export/render-export-html";
import { renderPlanogramSvg } from "@/lib/planogram-export/render-svg";

function buildMultiShelfFixture(shelfCount: number): {
  state: PlanogramState;
  layout: PlanogramLayout;
} {
  const rowHeightMm = 508;
  const shelves = Array.from({ length: shelfCount }, (_, index) => {
    const yMm = (index + 1) * rowHeightMm;
    return {
      id: `s${index + 1}`,
      index,
      minContentHeightMm: 500,
      minContentWidthMm: 900,
      yMm,
      items:
        index === 0
          ? [
              {
                id: "i1",
                shelfId: `s${index + 1}`,
                skuId: "sku-1",
                x: 0,
                y: 0,
                width: 66,
                height: 122,
                facingsWide: 2,
              },
            ]
          : [],
    };
  });

  const layoutShelves = shelves.map((shelf) => ({
    shelfId: shelf.id,
    index: shelf.index,
    yMm: shelf.yMm,
    rowTopMm: shelf.yMm - rowHeightMm,
    contentHeightMm: 500,
    rowHeightMm,
  }));

  const layout: PlanogramLayout = {
    contentWidthMm: 900,
    bounds: {
      x: 0,
      y: 0,
      width: 900,
      height: shelfCount * rowHeightMm,
    },
    shelves: layoutShelves,
    items:
      shelfCount > 0
        ? [
            {
              itemId: "i1",
              shelfId: "s1",
              skuId: "sku-1",
              y: 386,
              valid: true,
              rect: { x: 0, y: 386, width: 132, height: 122 },
            },
          ]
        : [],
  };

  const state: PlanogramState = {
    id: "p1",
    config: { topClearance: 8, stackGap: 2 },
    shelves,
  };

  return { state, layout };
}

const skuById = new Map([
  [
    "sku-1",
    {
      id: "sku-1",
      name: "Standard can 355 ml",
      sku: "CAN-355",
      width: 66,
      height: 122,
      color: "#3b82f6",
      imageUrl: "https://example.com/can.png",
    },
  ],
]);

describe("exportSvgFitScale", () => {
  it("returns 1 when the SVG already fits", () => {
    expect(
      exportSvgFitScale(400, 500, { maxWidthPx: 680, maxHeightPx: 640 }),
    ).toBe(1);
  });

  it("scales down to satisfy max height", () => {
    const scale = exportSvgFitScale(400, 2000, {
      maxWidthPx: 680,
      maxHeightPx: 640,
    });
    expect(scale).toBeCloseTo(640 / 2000);
  });
});

describe("overviewExportFit", () => {
  it("uses compact height above the scale threshold", () => {
    expect(overviewExportFit(3).maxHeightPx).toBeGreaterThan(
      overviewExportFit(4).maxHeightPx,
    );
    expect(overviewExportFit(5).maxHeightPx).toBe(
      EXPORT_OVERVIEW_COMPACT_MAX_HEIGHT_PX,
    );
  });
});

describe("slicePlanogramLayout", () => {
  it("rebases bounds to the selected shelves", () => {
    const { layout } = buildMultiShelfFixture(5);
    const sliced = slicePlanogramLayout(layout, new Set(["s3", "s4"]));
    expect(sliced.shelves.map((s) => s.shelfId)).toEqual(["s3", "s4"]);
    expect(sliced.bounds.y).toBe(layout.shelves[2].rowTopMm);
    expect(sliced.bounds.height).toBe(
      layout.shelves[3].yMm - layout.shelves[2].rowTopMm,
    );
  });
});

describe("chunkShelfLayouts", () => {
  it("chunks into groups of four", () => {
    const { layout } = buildMultiShelfFixture(9);
    const chunks = chunkShelfLayouts(layout.shelves, EXPORT_SECTION_SIZE);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(4);
    expect(chunks[1]).toHaveLength(4);
    expect(chunks[2]).toHaveLength(1);
    expect(shelfSectionLabel(chunks[0])).toBe("Shelves 1–4");
    expect(shelfSectionLabel(chunks[2])).toBe("Shelf 9");
  });
});

describe("renderPlanogramSvg fit", () => {
  it("shrinks width/height attributes while keeping viewBox", () => {
    const { state, layout } = buildMultiShelfFixture(5);
    const fit = overviewExportFit(5);
    const svg = renderPlanogramSvg({
      layout,
      state,
      skuById,
      planogramName: "Tall",
      fit,
    });

    const intrinsicHeight = mmToPx(layout.bounds.height);
    const match = svg.match(
      /width="([^"]+)" height="([^"]+)" viewBox="0 0 ([^"]+) ([^"]+)"/,
    );
    expect(match).not.toBeNull();
    const [, width, height, viewW, viewH] = match!;
    expect(Number(viewH)).toBeCloseTo(intrinsicHeight);
    expect(Number(height)).toBeLessThanOrEqual(fit.maxHeightPx + 0.01);
    expect(Number(height)).toBeLessThan(Number(viewH));
    expect(Number(width) / Number(height)).toBeCloseTo(
      Number(viewW) / Number(viewH),
    );
  });
});

describe("renderPlanogramExportHtml", () => {
  it("includes visual, shelf specs, and SKU list with image when present", () => {
    const { state, layout } = buildMultiShelfFixture(1);
    const html = renderPlanogramExportHtml({
      layout,
      state,
      planogramName: "Demo Bay",
      skuById,
    });

    expect(html).toContain("Demo Bay");
    expect(html).toContain("<title>planogram_demo-bay.pdf</title>");
    expect(html).toContain("<svg");
    expect(html).toContain("visual--overview");
    expect(html).toContain("Shelf specs");
    expect(html).toContain("SKU list");
    expect(html).toContain("<th>Color</th>");
    expect(html).toContain("CAN-355");
    expect(html).toContain("66 × 122");
    expect(html).toContain('src="https://example.com/can.png"');
    expect(html).toContain(">2</td>");
    expect(html).not.toContain("Shelves 1–4");
  });

  it("shows Color column with swatch and hex when image is present", () => {
    const { state, layout } = buildMultiShelfFixture(1);
    const html = renderPlanogramExportHtml({
      layout,
      state,
      planogramName: "Image + Color Bay",
      skuById,
    });

    expect(html).toContain('src="https://example.com/can.png"');
    expect(html).toContain('class="color-cell"');
    expect(html).toContain('fill="#3b82f6"');
    expect(html).toContain("<code>#3b82f6</code>");
  });

  it("shows Color column when image is missing and keeps image cell non-blank", () => {
    const { state, layout } = buildMultiShelfFixture(1);
    const html = renderPlanogramExportHtml({
      layout,
      state,
      planogramName: "Color Bay",
      skuById: new Map([
        [
          "sku-1",
          {
            id: "sku-1",
            name: "Standard can 355 ml",
            sku: "CAN-355",
            width: 66,
            height: 122,
            color: "#22c55e",
            imageUrl: null,
          },
        ],
      ]),
    });

    expect(html).toContain('class="thumb"');
    expect(html).toContain('class="placeholder">—</span>');
    expect(html).not.toContain("<img");
    expect(html).toContain('class="color-cell"');
    expect(html).toContain('fill="#22c55e"');
    expect(html).toContain("<code>#22c55e</code>");
  });

  it("shows empty SKU message when nothing is placed", () => {
    const { state, layout } = buildMultiShelfFixture(1);
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
    expect(html).toContain('colspan="6"');
  });

  it("scales overview for multi-shelf fixtures without sectioning at 5 shelves", () => {
    const { state, layout } = buildMultiShelfFixture(5);
    const html = renderPlanogramExportHtml({
      layout,
      state,
      planogramName: "Five Shelf",
      skuById,
    });

    expect(html).toContain("visual--overview");
    expect(html).not.toContain("visual--section");
    expect(html).not.toContain("Shelves 1–4");

    const heightMatch = html.match(/height="([^"]+)" viewBox="/);
    expect(heightMatch).not.toBeNull();
    expect(Number(heightMatch![1])).toBeLessThanOrEqual(
      EXPORT_OVERVIEW_COMPACT_MAX_HEIGHT_PX + 0.01,
    );
  });

  it("adds overview plus 4-shelf sections when shelf count exceeds threshold", () => {
    const { state, layout } = buildMultiShelfFixture(EXPORT_SECTION_AFTER + 1);
    const html = renderPlanogramExportHtml({
      layout,
      state,
      planogramName: "Nine Shelf",
      skuById,
    });

    expect(html).toContain("visual--overview");
    expect(html).toContain("Shelves 1–4");
    expect(html).toContain("Shelves 5–8");
    expect(html).toContain("Shelf 9");
    expect(html.match(/visual--section/g)?.length).toBe(3);
  });
});
