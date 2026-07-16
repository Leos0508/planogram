import { describe, expect, it } from "vitest";
import { canPlace } from "../placement";
import { nudgeItemX } from "../nudge";
import { projectDrop } from "../project-drop";
import { snapYToShelfItems } from "../snap";
import type { PlanogramState } from "../types";

function baseState(
  items: PlanogramState["shelves"][number]["items"] = [],
): PlanogramState {
  return {
    id: "p1",
    config: { topClearance: 100, stackGap: 10 },
    shelves: [
      {
        id: "s1",
        index: 0,
        minContentHeightMm: 500,
        minContentWidthMm: 200,
        yMm: 0,
        items,
      },
    ],
  };
}

describe("canPlace", () => {
  it("allows placement when shelf is empty", () => {
    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
      "s1",
      baseState().shelves,
      { topClearance: 100, stackGap: 10 },
    );
    expect(result.ok).toBe(true);
  });

  it("rejects overlapping items in 2D", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);

    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku2",
        x: 50,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(false);
  });

  it("allows stacked items at the same x", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);

    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku2",
        x: 0,
        width: 100,
        height: 150,
        y: 210,
        facingsWide: 1,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects placement above shelf content band", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);

    // Band = minContentHeightMm (500); reach 550 exceeds it
    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku2",
        x: 200,
        width: 100,
        height: 200,
        y: 350,
        facingsWide: 1,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("OUT_OF_BAND");
    }
  });

  it("allows placement up to the full content band height", () => {
    const state = baseState();

    // Reach exactly minContentHeightMm (500) — full teal band is placeable
    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku2",
        x: 0,
        width: 100,
        height: 200,
        y: 300,
        facingsWide: 1,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(true);
  });

  it("allows taller stacks when minContentHeightMm is increased", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);
    state.shelves[0].minContentHeightMm = 800;
    state.shelves[0].minContentWidthMm = 400;

    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku2",
        x: 200,
        width: 100,
        height: 200,
        y: 450,
        facingsWide: 1,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(true);
  });

  it("uses facings wide for collision width", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);
    state.shelves[0].minContentWidthMm = 400;

    const blocked = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku2",
        x: 50,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 2,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(blocked.ok).toBe(false);

    const allowed = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku2",
        x: 120,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 2,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(allowed.ok).toBe(true);
  });

  it("rejects placement past fixture width (OUT_OF_BAND)", () => {
    const state = baseState();
    state.shelves[0].minContentWidthMm = 200;

    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku1",
        x: 50,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 2,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("OUT_OF_BAND");
    }
  });

  it("allows wider placement after minContentWidthMm is increased", () => {
    const state = baseState();
    state.shelves[0].minContentWidthMm = 400;

    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku1",
        x: 50,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 2,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(true);
  });
});

describe("snapYToShelfItems", () => {
  it("prefers item top over shelf floor when both are in range", () => {
    const snapped = snapYToShelfItems(
      15,
      { x: 0, width: 100, height: 150, facingsWide: 1 },
      [{ x: 0, width: 100, height: 20, y: 0, facingsWide: 1 }],
      10,
      20,
    );
    expect(snapped).toBe(30);
  });

  it("snaps to shelf floor when no stack target overlaps", () => {
    const snapped = snapYToShelfItems(
      4,
      { x: 300, width: 100, height: 150, facingsWide: 1 },
      [{ x: 0, width: 100, height: 200, y: 0, facingsWide: 1 }],
      10,
      8,
    );
    expect(snapped).toBe(0);
  });
});

describe("nudgeItemX", () => {
  it("nudges item when space is available", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);

    expect(nudgeItemX(state, "i1", 10)).toEqual({
      itemId: "i1",
      shelfId: "s1",
      x: 10,
      y: 0,
    });
  });

  it("returns null when nudge causes collision", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
      {
        id: "i2",
        shelfId: "s1",
        skuId: "sku2",
        x: 120,
        width: 100,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);

    expect(nudgeItemX(state, "i1", 30)).toBeNull();
  });
});

describe("projectDrop", () => {
  it("projects a valid drop onto an empty shelf", () => {
    const state = baseState();
    const result = projectDrop(state, {
      pointerMm: { x: 50, y: 500 },
      sku: { width: 100, height: 200 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shelfId).toBe("s1");
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBe(0);
      expect(result.previewRect?.width).toBe(100);
    }
  });

  it("rejects drop when base row is occupied at the same y", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 200,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);

    const result = projectDrop(state, {
      pointerMm: { x: 80, y: 500 },
      sku: { width: 100, height: 200 },
    });

    expect(result.ok).toBe(false);
  });

  it("allows stacking over an occupied base row at the same x", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 200,
        height: 200,
        y: 0,
        facingsWide: 1,
      },
    ]);

    const layout = projectDrop(state, {
      pointerMm: { x: 80, y: 315 },
      sku: { width: 100, height: 150 },
    });

    expect(layout.ok).toBe(true);
    if (layout.ok) {
      expect(layout.y).toBe(210);
    }
  });

  it("skips Y snap when forceFloat is set", () => {
    const state = baseState();

    const snapped = projectDrop(state, {
      pointerMm: { x: 50, y: 500 },
      sku: { width: 100, height: 150 },
    });
    const floating = projectDrop(state, {
      pointerMm: { x: 50, y: 500 },
      sku: { width: 100, height: 150 },
      forceFloat: true,
    });

    expect(snapped.ok).toBe(true);
    expect(floating.ok).toBe(true);
    if (snapped.ok && floating.ok) {
      expect(snapped.y).toBe(0);
      expect(floating.y).toBe(25);
    }
  });
});
