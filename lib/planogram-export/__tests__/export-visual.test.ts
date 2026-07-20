import { describe, expect, it } from "vitest";
import {
  chunkShelfLayouts,
  exportSvgFitScale,
  overviewExportFit,
  shelfSectionLabel,
  slicePlanogramLayout,
  EXPORT_OVERVIEW_COMPACT_MAX_HEIGHT_PX,
  EXPORT_SECTION_SIZE,
} from "@/lib/planogram-export/export-visual";
import type { PlanogramLayout } from "@/lib/planogram-engine/types";

describe("export-visual helpers", () => {
  it("exportSvgFitScale caps by the tighter axis", () => {
    expect(
      exportSvgFitScale(1000, 500, { maxWidthPx: 500, maxHeightPx: 800 }),
    ).toBe(0.5);
  });

  it("overviewExportFit tightens height after three shelves", () => {
    expect(overviewExportFit(4).maxHeightPx).toBe(
      EXPORT_OVERVIEW_COMPACT_MAX_HEIGHT_PX,
    );
  });

  it("chunkShelfLayouts and shelfSectionLabel cover remainders", () => {
    const shelves = Array.from({ length: 5 }, (_, index) => ({
      shelfId: `s${index}`,
      index,
      yMm: (index + 1) * 100,
      rowTopMm: index * 100,
      contentHeightMm: 90,
      rowHeightMm: 100,
    }));
    const chunks = chunkShelfLayouts(shelves, EXPORT_SECTION_SIZE);
    expect(chunks).toHaveLength(2);
    expect(shelfSectionLabel(chunks[0])).toBe("Shelves 1–4");
    expect(shelfSectionLabel(chunks[1])).toBe("Shelf 5");
  });

  it("slicePlanogramLayout filters items and rebases bounds", () => {
    const layout: PlanogramLayout = {
      contentWidthMm: 200,
      bounds: { x: 0, y: 0, width: 200, height: 300 },
      shelves: [
        {
          shelfId: "a",
          index: 0,
          yMm: 100,
          rowTopMm: 0,
          contentHeightMm: 90,
          rowHeightMm: 100,
        },
        {
          shelfId: "b",
          index: 1,
          yMm: 200,
          rowTopMm: 100,
          contentHeightMm: 90,
          rowHeightMm: 100,
        },
        {
          shelfId: "c",
          index: 2,
          yMm: 300,
          rowTopMm: 200,
          contentHeightMm: 90,
          rowHeightMm: 100,
        },
      ],
      items: [
        {
          itemId: "i1",
          shelfId: "b",
          skuId: "sku",
          y: 120,
          valid: true,
          rect: { x: 0, y: 120, width: 40, height: 40 },
        },
      ],
    };

    const sliced = slicePlanogramLayout(layout, new Set(["b", "c"]));
    expect(sliced.shelves.map((s) => s.shelfId)).toEqual(["b", "c"]);
    expect(sliced.items).toHaveLength(1);
    expect(sliced.bounds.y).toBe(100);
    expect(sliced.bounds.height).toBe(200);
  });
});
