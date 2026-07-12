import { describe, expect, it } from "vitest";
import { resolveShelfForDrop } from "../drop-zone";
import type { ShelfLayout } from "../types";

const shelves: ShelfLayout[] = [
  {
    shelfId: "s1",
    index: 0,
    rowTopMm: 0,
    yMm: 600,
    contentHeightMm: 500,
    rowHeightMm: 600,
  },
  {
    shelfId: "s2",
    index: 1,
    rowTopMm: 600,
    yMm: 1200,
    contentHeightMm: 500,
    rowHeightMm: 600,
  },
];

describe("resolveShelfForDrop", () => {
  it("returns null when pointer is above all shelves", () => {
    expect(resolveShelfForDrop({ x: 50, y: -100 }, 100, shelves, 100)).toBeNull();
  });

  it("resolves shelf when pointer is in content band", () => {
    expect(
      resolveShelfForDrop({ x: 50, y: 350 }, 100, shelves, 100)?.shelfId,
    ).toBe("s1");
  });

  it("uses vertical span so edge drops still hit shelf", () => {
    expect(
      resolveShelfForDrop({ x: 50, y: 540 }, 200, shelves, 100)?.shelfId,
    ).toBe("s1");
  });

  it("resolves second shelf when pointer is lower", () => {
    expect(
      resolveShelfForDrop({ x: 50, y: 950 }, 100, shelves, 100)?.shelfId,
    ).toBe("s2");
  });
});
