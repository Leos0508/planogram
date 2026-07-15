export const PLANOGRAM_SORTS = ["updated", "name", "created"] as const;
export type PlanogramSort = (typeof PLANOGRAM_SORTS)[number];

export const PLANOGRAM_ITEM_FILTERS = ["all", "empty", "has-items"] as const;
export type PlanogramItemFilter = (typeof PLANOGRAM_ITEM_FILTERS)[number];

export const DEFAULT_PLANOGRAM_SORT: PlanogramSort = "updated";
export const DEFAULT_PLANOGRAM_ITEM_FILTER: PlanogramItemFilter = "all";

export function parsePlanogramSort(value: string | null): PlanogramSort {
  if (value && (PLANOGRAM_SORTS as readonly string[]).includes(value)) {
    return value as PlanogramSort;
  }
  return DEFAULT_PLANOGRAM_SORT;
}

export function parsePlanogramItemFilter(
  value: string | null,
): PlanogramItemFilter {
  if (value && (PLANOGRAM_ITEM_FILTERS as readonly string[]).includes(value)) {
    return value as PlanogramItemFilter;
  }
  return DEFAULT_PLANOGRAM_ITEM_FILTER;
}

export function filterPlanogramsByName<T extends { name: string }>(
  planograms: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return planograms;

  return planograms.filter((planogram) =>
    planogram.name.toLowerCase().includes(normalized),
  );
}

export function filterPlanogramsByItemPresence<
  T extends { itemCount: number },
>(planograms: T[], filter: PlanogramItemFilter): T[] {
  if (filter === "all") return planograms;
  if (filter === "empty") {
    return planograms.filter((planogram) => planogram.itemCount === 0);
  }
  return planograms.filter((planogram) => planogram.itemCount > 0);
}

function timestampMs(value: Date | string): number {
  return new Date(value).getTime();
}

/**
 * Client-side sort for the catalog list. Server fetch (`getPlanograms`) always
 * returns `updatedAt` desc; list UX reorders in the browser so search/filter/
 * sort can compose from one payload (and stay shareable via URL params).
 * Dates may be `Date` or ISO strings (RSC serialization).
 */
export function sortPlanograms<
  T extends { name: string; createdAt: Date | string; updatedAt: Date | string },
>(planograms: T[], sort: PlanogramSort): T[] {
  const sorted = [...planograms];

  switch (sort) {
    case "name":
      return sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    case "created":
      return sorted.sort(
        (a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt),
      );
    case "updated":
    default:
      return sorted.sort(
        (a, b) => timestampMs(b.updatedAt) - timestampMs(a.updatedAt),
      );
  }
}

export function applyPlanogramListQuery<
  T extends {
    name: string;
    itemCount: number;
    createdAt: Date | string;
    updatedAt: Date | string;
  },
>(
  planograms: T[],
  options: {
    query?: string;
    sort?: PlanogramSort;
    itemFilter?: PlanogramItemFilter;
  },
): T[] {
  const byName = filterPlanogramsByName(planograms, options.query ?? "");
  const byItems = filterPlanogramsByItemPresence(
    byName,
    options.itemFilter ?? DEFAULT_PLANOGRAM_ITEM_FILTER,
  );
  return sortPlanograms(byItems, options.sort ?? DEFAULT_PLANOGRAM_SORT);
}
