import { describe, expect, it } from "vitest";
import { shelfDisplayLabel, shelfDisplayNumber } from "../shelf-label";

describe("shelfDisplayLabel", () => {
  it("maps 0-based engine index to 1-based UI labels", () => {
    expect(shelfDisplayNumber(0)).toBe(1);
    expect(shelfDisplayLabel(0)).toBe("Shelf 1");
    expect(shelfDisplayLabel(2)).toBe("Shelf 3");
  });
});
