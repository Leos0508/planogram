import { describe, expect, it } from "vitest";
import {
  applyPlanogramListQuery,
  filterPlanogramsByItemPresence,
  filterPlanogramsByName,
  parsePlanogramItemFilter,
  parsePlanogramSort,
  sortPlanograms,
} from "../filter";

const items = [
  { id: "1", name: "Beverage aisle" },
  { id: "2", name: "Snack wall" },
  { id: "3", name: "BEVERAGE endcap" },
];

const dated = [
  {
    id: "a",
    name: "Zebra",
    itemCount: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-03-01T00:00:00Z"),
  },
  {
    id: "b",
    name: "Apple",
    itemCount: 3,
    createdAt: new Date("2026-02-01T00:00:00Z"),
    updatedAt: new Date("2026-02-15T00:00:00Z"),
  },
  {
    id: "c",
    name: "Mango",
    itemCount: 1,
    createdAt: new Date("2026-03-01T00:00:00Z"),
    updatedAt: new Date("2026-01-10T00:00:00Z"),
  },
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

describe("parsePlanogramSort / parsePlanogramItemFilter", () => {
  it("parses known values and falls back to defaults", () => {
    expect(parsePlanogramSort("name")).toBe("name");
    expect(parsePlanogramSort("created")).toBe("created");
    expect(parsePlanogramSort("updated")).toBe("updated");
    expect(parsePlanogramSort(null)).toBe("updated");
    expect(parsePlanogramSort("nope")).toBe("updated");

    expect(parsePlanogramItemFilter("empty")).toBe("empty");
    expect(parsePlanogramItemFilter("has-items")).toBe("has-items");
    expect(parsePlanogramItemFilter("all")).toBe("all");
    expect(parsePlanogramItemFilter(null)).toBe("all");
    expect(parsePlanogramItemFilter("nope")).toBe("all");
  });
});

describe("filterPlanogramsByItemPresence", () => {
  it("filters by empty / has-items / all", () => {
    expect(filterPlanogramsByItemPresence(dated, "all")).toEqual(dated);
    expect(filterPlanogramsByItemPresence(dated, "empty")).toEqual([dated[0]]);
    expect(filterPlanogramsByItemPresence(dated, "has-items")).toEqual([
      dated[1],
      dated[2],
    ]);
  });
});

describe("sortPlanograms", () => {
  it("sorts by updatedAt desc by default", () => {
    expect(sortPlanograms(dated, "updated").map((row) => row.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("sorts by name A–Z", () => {
    expect(sortPlanograms(dated, "name").map((row) => row.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("sorts by createdAt desc", () => {
    expect(sortPlanograms(dated, "created").map((row) => row.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("sorts ISO date strings the same as Date objects", () => {
    const asStrings = dated.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
    expect(sortPlanograms(asStrings, "updated").map((row) => row.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("applyPlanogramListQuery", () => {
  it("composes name filter, item filter, and sort", () => {
    const result = applyPlanogramListQuery(
      [
        ...dated,
        {
          id: "d",
          name: "Apple juice",
          itemCount: 0,
          createdAt: new Date("2026-04-01T00:00:00Z"),
          updatedAt: new Date("2026-04-01T00:00:00Z"),
        },
      ],
      { query: "apple", itemFilter: "empty", sort: "name" },
    );

    expect(result.map((row) => row.id)).toEqual(["d"]);
  });
});
