import { describe, expect, it } from "vitest";
import { filterSkusByQuery } from "../filter";

const items = [
  { id: "1", name: "Cola 330ml", sku: "COLA-330" },
  { id: "2", name: "Water still", sku: "WTR-01" },
  { id: "3", name: "Diet Cola", sku: "COLA-DIET" },
];

describe("filterSkusByQuery", () => {
  it("returns all items when query is empty or whitespace", () => {
    expect(filterSkusByQuery(items, "")).toEqual(items);
    expect(filterSkusByQuery(items, "   ")).toEqual(items);
  });

  it("matches name case-insensitively", () => {
    expect(filterSkusByQuery(items, "cola")).toEqual([items[0], items[2]]);
    expect(filterSkusByQuery(items, "WATER")).toEqual([items[1]]);
  });

  it("matches SKU code case-insensitively", () => {
    expect(filterSkusByQuery(items, "wtr-01")).toEqual([items[1]]);
    expect(filterSkusByQuery(items, "COLA-")).toEqual([items[0], items[2]]);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterSkusByQuery(items, "chips")).toEqual([]);
  });
});
