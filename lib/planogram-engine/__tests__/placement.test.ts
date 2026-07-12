import { describe, expect, it } from "vitest";
import { canPlace } from "../placement";
import { nudgeItemX } from "../nudge";
import { projectDrop } from "../project-drop";
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
        stackIndex: 0,
        facingsWide: 1,
      },
      "s1",
      baseState().shelves,
      { topClearance: 100, stackGap: 10 },
    );
    expect(result.ok).toBe(true);
  });

  it("rejects overlapping items on same stack", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        stackIndex: 0,
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
        stackIndex: 0,
        facingsWide: 1,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(false);
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
        stackIndex: 0,
        facingsWide: 1,
      },
    ]);

    const blocked = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku2",
        x: 50,
        width: 100,
        height: 200,
        stackIndex: 0,
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
        stackIndex: 0,
        facingsWide: 2,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(allowed.ok).toBe(true);
  });
  it("allows same X on a different stack tier", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        stackIndex: 0,
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
        stackIndex: 1,
        facingsWide: 1,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects overlapping items on the same upper stack tier", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 100,
        height: 200,
        stackIndex: 0,
        facingsWide: 1,
      },
      {
        id: "i2",
        shelfId: "s1",
        skuId: "sku2",
        x: 0,
        width: 100,
        height: 150,
        stackIndex: 1,
        facingsWide: 1,
      },
    ]);

    const result = canPlace(
      {
        id: "preview",
        shelfId: "s1",
        skuId: "sku3",
        x: 40,
        width: 100,
        height: 150,
        stackIndex: 1,
        facingsWide: 1,
      },
      "s1",
      state.shelves,
      state.config,
    );
    expect(result.ok).toBe(false);
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
        stackIndex: 0,
        facingsWide: 1,
      },
    ]);

    expect(nudgeItemX(state, "i1", 10)).toEqual({
      itemId: "i1",
      shelfId: "s1",
      x: 10,
      stackIndex: 0,
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
        stackIndex: 0,
        facingsWide: 1,
      },
      {
        id: "i2",
        shelfId: "s1",
        skuId: "sku2",
        x: 120,
        width: 100,
        height: 200,
        stackIndex: 0,
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
      expect(result.previewRect?.width).toBe(100);
    }
  });

  it("rejects drop when shelf row is occupied", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 200,
        height: 200,
        stackIndex: 0,
        facingsWide: 1,
      },
    ]);

    const result = projectDrop(state, {
      pointerMm: { x: 80, y: 500 },
      sku: { width: 100, height: 200 },
    });

    expect(result.ok).toBe(false);
  });

  it("allows stackIndex 1 over an occupied base row at the same X", () => {
    const state = baseState([
      {
        id: "i1",
        shelfId: "s1",
        skuId: "sku1",
        x: 0,
        width: 200,
        height: 200,
        stackIndex: 0,
        facingsWide: 1,
      },
    ]);

    const result = projectDrop(state, {
      pointerMm: { x: 80, y: 500 },
      sku: { width: 100, height: 150 },
      stackIndex: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stackIndex).toBe(1);
      expect(result.shelfId).toBe("s1");
    }
  });
});
