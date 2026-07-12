import type { PlanogramItem } from "./types";

export const DEFAULT_FACINGS_WIDE = 1;
export const MAX_FACINGS_WIDE = 99;

export function itemFacingsWide(
  item: Pick<PlanogramItem, "facingsWide"> | { facingsWide?: number },
): number {
  const value = item.facingsWide ?? DEFAULT_FACINGS_WIDE;
  if (!Number.isFinite(value)) return DEFAULT_FACINGS_WIDE;
  return Math.min(MAX_FACINGS_WIDE, Math.max(DEFAULT_FACINGS_WIDE, Math.floor(value)));
}

export function itemFootprintWidth(
  item: Pick<PlanogramItem, "width" | "facingsWide">,
): number {
  return item.width * itemFacingsWide(item);
}
