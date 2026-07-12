import { describe, expect, it } from "vitest";
import { snapThresholdMm } from "../constant";

describe("snapThresholdMm", () => {
  it("returns larger mm threshold when zoomed out", () => {
    expect(snapThresholdMm(0.5)).toBeGreaterThan(snapThresholdMm(1));
  });

  it("returns smaller mm threshold when zoomed in", () => {
    expect(snapThresholdMm(2)).toBeLessThan(snapThresholdMm(1));
  });
});
