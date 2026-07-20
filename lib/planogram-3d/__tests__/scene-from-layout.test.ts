import { describe, expect, it } from "vitest";
import { computePlanogramLayout } from "@/lib/planogram-engine/layout";
import type { PlanogramState } from "@/lib/planogram-engine/types";
import {
  buildPlanogram3DScene,
  BACKBOARD_THICKNESS_MM,
  DEFAULT_BOX_DEPTH_MM,
  ITEM_SHELF_GAP_MM,
  SHELF_BOARD_THICKNESS_MM,
  SHELF_DEPTH_MM,
} from "@/lib/planogram-3d/scene-from-layout";
import type { SkuPackaging } from "@/lib/skus/packaging";

const sampleCan: SkuPackaging = {
  shape: "CAN",
  bodyDiameterMm: 66,
  heightMm: 115,
  endDiameterMm: 65,
  baseDiameterMm: 64,
};

function sampleState(): PlanogramState {
  return {
    id: "pg-1",
    config: { topClearance: 40, stackGap: 20 },
    shelves: [
      {
        id: "shelf-0",
        index: 0,
        minContentHeightMm: 300,
        minContentWidthMm: 1000,
        yMm: 0,
        items: [
          {
            id: "item-flat",
            shelfId: "shelf-0",
            skuId: "sku-flat",
            x: 0,
            width: 80,
            height: 120,
            y: 0,
            facingsWide: 2,
          },
          {
            id: "item-can",
            shelfId: "shelf-0",
            skuId: "sku-can",
            x: 200,
            width: 66,
            height: 115,
            y: 10,
            facingsWide: 1,
          },
        ],
      },
      {
        id: "shelf-1",
        index: 1,
        minContentHeightMm: 300,
        minContentWidthMm: 1000,
        yMm: 0,
        items: [],
      },
    ],
  };
}

describe("buildPlanogram3DScene", () => {
  it("builds shelf boards and maps planogram Y-down to scene Y-up", () => {
    const state = sampleState();
    const layout = computePlanogramLayout(state);
    const scene = buildPlanogram3DScene(layout, state, new Map());

    expect(scene.shelves).toHaveLength(2);
    expect(scene.shelves[0]!.size.depth).toBe(SHELF_DEPTH_MM);
    expect(scene.shelves[0]!.size.height).toBe(SHELF_BOARD_THICKNESS_MM);

    expect(scene.backdrop).not.toBeNull();
    expect(scene.backdrop!.size.depth).toBe(BACKBOARD_THICKNESS_MM);
    expect(scene.backdrop!.size.width).toBe(scene.shelves[0]!.size.width);
    expect(scene.backdrop!.position.z).toBeCloseTo(
      -SHELF_DEPTH_MM - BACKBOARD_THICKNESS_MM / 2,
      5,
    );
    const topMm = Math.min(...layout.shelves.map((shelf) => shelf.rowTopMm));
    const bottomMm = Math.max(...layout.shelves.map((shelf) => shelf.yMm));
    expect(scene.backdrop!.size.height).toBeCloseTo(
      -topMm - (-bottomMm - SHELF_BOARD_THICKNESS_MM),
      5,
    );

    const shelf0 = layout.shelves[0]!;
    const shelf1 = layout.shelves[1]!;
    expect(scene.shelves[0]!.position.y).toBeCloseTo(
      -shelf0.yMm - SHELF_BOARD_THICKNESS_MM / 2,
      5,
    );
    expect(scene.shelves[1]!.position.y).toBeCloseTo(
      -shelf1.yMm - SHELF_BOARD_THICKNESS_MM / 2,
      5,
    );
    // Upper shelf (smaller planogram yMm) sits higher in scene Y.
    expect(scene.shelves[0]!.position.y).toBeGreaterThan(
      scene.shelves[1]!.position.y,
    );
  });

  it("emits one mesh per facing and falls back to box extrusion", () => {
    const state = sampleState();
    const layout = computePlanogramLayout(state);
    const scene = buildPlanogram3DScene(
      layout,
      state,
      new Map([
        [
          "sku-flat",
          {
            color: "#ff0000",
            width: 80,
            height: 120,
            shape: null,
            packaging: null,
          },
        ],
        [
          "sku-can",
          {
            color: "#00ff00",
            width: 66,
            height: 115,
            shape: "CAN",
            packaging: sampleCan,
          },
        ],
      ]),
    );

    expect(scene.items).toHaveLength(3);

    const flats = scene.items.filter((item) => item.itemId === "item-flat");
    expect(flats).toHaveLength(2);
    expect(flats[0]!.mesh.kind).toBe("box");
    if (flats[0]!.mesh.kind === "box") {
      expect(flats[0]!.mesh.width).toBe(80);
      expect(flats[0]!.mesh.height).toBe(120);
      expect(flats[0]!.mesh.depth).toBe(Math.min(DEFAULT_BOX_DEPTH_MM, 80));
    }
    expect(flats[0]!.position.x).toBeCloseTo(40, 5);
    expect(flats[1]!.position.x).toBeCloseTo(120, 5);
    expect(flats[0]!.color).toBe("#ff0000");

    const can = scene.items.find((item) => item.itemId === "item-can");
    expect(can).toBeDefined();
    expect(can!.mesh.kind).toBe("packaging");
    if (can!.mesh.kind === "packaging") {
      expect(can!.mesh.packaging.shape).toBe("CAN");
    }
    // Floating 10 mm above shelf line + gap → base at -shelfY + 10 + gap
    const shelf0 = layout.shelves[0]!;
    expect(can!.position.y).toBeCloseTo(
      -shelf0.yMm + 10 + ITEM_SHELF_GAP_MM,
      5,
    );
  });

  it("ignores invalid packaging JSON and uses box fallback", () => {
    const state = sampleState();
    const layout = computePlanogramLayout(state);
    const scene = buildPlanogram3DScene(
      layout,
      state,
      new Map([
        [
          "sku-can",
          {
            color: "#0000ff",
            width: 66,
            height: 115,
            shape: "CAN",
            packaging: { bodyDiameterMm: -1 },
          },
        ],
      ]),
    );

    const can = scene.items.find((item) => item.itemId === "item-can");
    expect(can!.mesh.kind).toBe("box");
  });
});
