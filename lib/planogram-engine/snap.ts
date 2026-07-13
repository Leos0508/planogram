import type { PlanogramItem } from "./types";
import { itemFootprintWidth } from "./facings";

type SnapEdge = {
  position: (x: number) => number;
  xForLine: (line: number) => number;
};

const DISTANCE_EPS_MM = 0.001;

const candidateEdges = (width: number): SnapEdge[] => [
  { position: (x) => x, xForLine: (line) => line },
  { position: (x) => x + width, xForLine: (line) => line - width },
  { position: (x) => x + width / 2, xForLine: (line) => line - width / 2 },
];

function snapLinesForItem(item: Pick<PlanogramItem, "x" | "width" | "facingsWide">): number[] {
  const width = itemFootprintWidth(item);
  return [item.x, item.x + width, item.x + width / 2];
}

function footprintsOverlapX(
  aX: number,
  aWidth: number,
  b: Pick<PlanogramItem, "x" | "width" | "facingsWide">,
): boolean {
  const bWidth = itemFootprintWidth(b);
  return aX < b.x + bWidth && aX + aWidth > b.x;
}

/**
 * Snap a candidate x to nearby items on the same shelf.
 * Deterministic: sorted targets, closest edge wins, then smallest movement.
 */
export function snapXToShelfItems(
  rawX: number,
  width: number,
  others: Pick<PlanogramItem, "x" | "width" | "facingsWide">[],
  thresholdMm: number,
): number {
  if (others.length === 0 || thresholdMm <= 0) {
    return rawX;
  }

  let bestX = rawX;
  let bestDistance = thresholdMm + 1;
  let bestMovement = Number.POSITIVE_INFINITY;

  const sortedOthers = [...others].sort(
    (a, b) =>
      a.x - b.x || itemFootprintWidth(a) - itemFootprintWidth(b),
  );

  for (const other of sortedOthers) {
    for (const line of snapLinesForItem(other)) {
      for (const edge of candidateEdges(width)) {
        const distance = Math.abs(edge.position(rawX) - line);
        if (distance > thresholdMm) {
          continue;
        }

        const snappedX = Math.max(0, edge.xForLine(line));
        const movement = Math.abs(snappedX - rawX);
        const isCloser = distance < bestDistance - DISTANCE_EPS_MM;
        const isTie =
          Math.abs(distance - bestDistance) <= DISTANCE_EPS_MM &&
          movement < bestMovement - DISTANCE_EPS_MM;

        if (!isCloser && !isTie) {
          continue;
        }

        bestDistance = distance;
        bestMovement = movement;
        bestX = snappedX;
      }
    }
  }

  return bestX;
}

/**
 * Snap candidate bottom y to item tops (priority A) then shelf floor (y = 0).
 * Only considers items whose X footprint overlaps the candidate.
 */
export function snapYToShelfItems(
  rawBottomY: number,
  candidate: Pick<PlanogramItem, "x" | "width" | "height" | "facingsWide">,
  others: Pick<PlanogramItem, "x" | "width" | "height" | "y" | "facingsWide">[],
  stackGap: number,
  thresholdMm: number,
): number {
  if (thresholdMm <= 0) {
    return rawBottomY;
  }

  const width = itemFootprintWidth(candidate);

  let bestStackY = rawBottomY;
  let bestStackDistance = thresholdMm + 1;

  for (const other of others) {
    if (!footprintsOverlapX(candidate.x, width, other)) {
      continue;
    }

    const targetY = other.y + other.height + stackGap;
    const distance = Math.abs(rawBottomY - targetY);
    if (distance <= thresholdMm && distance < bestStackDistance) {
      bestStackDistance = distance;
      bestStackY = targetY;
    }
  }

  if (bestStackDistance <= thresholdMm) {
    return bestStackY;
  }

  if (Math.abs(rawBottomY) <= thresholdMm) {
    return 0;
  }

  return rawBottomY;
}
