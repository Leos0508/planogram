import { describe, expect, it } from "vitest";
import {
  DRAG_ACTIVATION_DISTANCE_PX,
  hasExceededDragActivationDistance,
  snapThresholdMm,
} from "../constant";

describe("snapThresholdMm", () => {
  it("returns larger mm threshold when zoomed out", () => {
    expect(snapThresholdMm(0.5)).toBeGreaterThan(snapThresholdMm(1));
  });

  it("returns smaller mm threshold when zoomed in", () => {
    expect(snapThresholdMm(2)).toBeLessThan(snapThresholdMm(1));
  });
});

describe("hasExceededDragActivationDistance", () => {
  it("treats sub-threshold movement as a click (not armed)", () => {
    expect(
      hasExceededDragActivationDistance(100, 100, 102, 101),
    ).toBe(false);
    expect(
      hasExceededDragActivationDistance(
        0,
        0,
        DRAG_ACTIVATION_DISTANCE_PX - 1,
        0,
      ),
    ).toBe(false);
  });

  it("arms drag at exactly the 4px threshold", () => {
    expect(
      hasExceededDragActivationDistance(
        0,
        0,
        DRAG_ACTIVATION_DISTANCE_PX,
        0,
      ),
    ).toBe(true);
  });

  it("arms drag for diagonal movement that reaches threshold", () => {
    // 3² + 3² = 18 ≥ 4² = 16
    expect(hasExceededDragActivationDistance(10, 10, 13, 13)).toBe(true);
  });
});
