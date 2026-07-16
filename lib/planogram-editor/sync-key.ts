import type { PlanogramDetail } from "@/lib/planograms/queries";

/** Key for planogram fixture/settings changes — excludes item positions. */
export function planogramStructureKey(planogram: PlanogramDetail): string {
  const shelfIds = [...planogram.shelves]
    .sort((a, b) => a.index - b.index)
    .map((shelf) => `${shelf.id}:${shelf.minContentHeightMm}:${shelf.minContentWidthMm}`)
    .join(",");

  return [
    planogram.id,
    planogram.name,
    planogram.topClearance,
    planogram.stackGap,
    shelfIds,
  ].join("|");
}
