import type { PlanogramItem } from "@/lib/planogram-engine";

export type PlanogramHistoryEntry =
  | { type: "place"; item: PlanogramItem }
  | { type: "delete"; item: PlanogramItem }
  | {
      type: "move";
      itemId: string;
      from: { shelfId: string; x: number; stackIndex: number };
      to: { shelfId: string; x: number; stackIndex: number };
    }
  | { type: "facings"; itemId: string; from: number; to: number }
  | {
      type: "batchMove";
      moves: Array<{
        itemId: string;
        from: { shelfId: string; x: number; stackIndex: number };
        to: { shelfId: string; x: number; stackIndex: number };
      }>;
    };

export function invertHistoryEntry(
  entry: PlanogramHistoryEntry,
): PlanogramHistoryEntry {
  switch (entry.type) {
    case "place":
      return { type: "delete", item: entry.item };
    case "delete":
      return { type: "place", item: entry.item };
    case "move":
      return {
        type: "move",
        itemId: entry.itemId,
        from: entry.to,
        to: entry.from,
      };
    case "facings":
      return {
        type: "facings",
        itemId: entry.itemId,
        from: entry.to,
        to: entry.from,
      };
    case "batchMove":
      return {
        type: "batchMove",
        moves: entry.moves.map((move) => ({
          itemId: move.itemId,
          from: move.to,
          to: move.from,
        })),
      };
  }
}
