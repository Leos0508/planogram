import { describe, expect, it } from "vitest";
import { filterPlanogramsByName } from "../filter";

const items = [
  { id: "1", name: "Beverage aisle" },
  { id: "2", name: "Snack wall" },
  { id: "3", name: "BEVERAGE endcap" },
];

describe("filterPlanogramsByName", () => {
  it("returns all items when query is empty or whitespace", () => {
    expect(filterPlanogramsByName(items, "")).toEqual(items);
    expect(filterPlanogramsByName(items, "   ")).toEqual(items);
  });

  it("matches case-insensitively by substring", () => {
    expect(filterPlanogramsByName(items, "beverage")).toEqual([
      items[0],
      items[2],
    ]);
    expect(filterPlanogramsByName(items, "SNACK")).toEqual([items[1]]);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterPlanogramsByName(items, "dairy")).toEqual([]);
  });
});
