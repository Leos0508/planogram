import { MIN_SHELF_CONTENT_HEIGHT_MM, MIN_SHELF_WIDTH_MM } from "./constant";
import { itemFootprintWidth } from "./facings";
import type {
  PlanogramConfig,
  PlanogramItem,
  PlanogramLayout,
  PlanogramShelf,
  PlanogramState,
  RectMm,
  ShelfLayout,
} from "./types";

export const PREVIEW_ITEM_ID = "__preview__";

export function previewItemId(candidate: { id?: string }): string {
  return candidate.id ?? PREVIEW_ITEM_ID;
}

export type LayoutPreviewItem = Omit<PlanogramItem, "id"> & {
  id?: string;
  shelfId: string;
};

export function withCandidateOnShelf(
  shelves: PlanogramShelf[],
  shelfId: string,
  candidate: Omit<PlanogramItem, "id"> & { id?: string },
): PlanogramShelf[] {
  return shelves.map((shelf) => {
    if (shelf.id !== shelfId) return shelf;

    return {
      ...shelf,
      items: [
        ...shelf.items.filter((item) => item.id !== candidate.id),
        {
          ...candidate,
          id: candidate.id ?? PREVIEW_ITEM_ID,
          shelfId: shelf.id,
        } satisfies PlanogramItem,
      ],
    };
  });
}

export function stackHeightBelow(
  items: PlanogramItem[],
  target: Pick<PlanogramItem, "stackIndex">,
  config: PlanogramConfig,
): number {
  return items
    .filter(
      (item) => item.stackIndex < target.stackIndex && item.stackIndex >= 0,
    )
    .reduce((sum, item) => sum + item.height + config.stackGap, 0);
}

function maxContentHeightMm(
  items: PlanogramItem[],
  config: PlanogramConfig,
): number {
  let max = 0;

  for (const item of items) {
    const below = stackHeightBelow(items, item, config);
    const reach = below + item.stackIndex * config.stackGap + item.height;
    max = Math.max(max, reach);
  }

  return Math.max(MIN_SHELF_CONTENT_HEIGHT_MM, max);
}

/** Stack shelf rows: [topClearance] [item area] [shelf line] → repeat. */
export function computeShelfPositions(
  shelves: Array<Omit<PlanogramShelf, "yMm"> | PlanogramShelf>,
  config: PlanogramConfig,
): PlanogramShelf[] {
  const sorted = [...shelves].sort((a, b) => a.index - b.index);
  let cursorY = 0;

  return sorted.map((shelf) => {
    cursorY += config.topClearance;
    cursorY += maxContentHeightMm(shelf.items, config);

    return { ...shelf, yMm: cursorY };
  });
}

function buildShelfLayouts(
  shelves: PlanogramShelf[],
  config: PlanogramConfig,
): ShelfLayout[] {
  return [...shelves]
    .sort((a, b) => a.index - b.index)
    .map((shelf) => {
      const contentHeightMm = maxContentHeightMm(shelf.items, config);

      return {
        shelfId: shelf.id,
        index: shelf.index,
        yMm: shelf.yMm,
        rowTopMm: shelf.yMm - contentHeightMm - config.topClearance,
        contentHeightMm,
        rowHeightMm: contentHeightMm + config.topClearance,
      };
    });
}

/** Bottom of item sits on the shelf line; stackIndex grows upward. */
export function computeItemRect(
  item: Pick<PlanogramItem, "x" | "width" | "height" | "stackIndex" | "facingsWide">,
  shelfYMm: number,
  config: PlanogramConfig,
  stackHeightBelowMm: number,
): RectMm {
  const bottomMm =
    shelfYMm - stackHeightBelowMm - item.stackIndex * config.stackGap;

  return {
    x: item.x,
    y: bottomMm - item.height,
    width: itemFootprintWidth(item),
    height: item.height,
  };
}

/** Shelf width from placed item extents (includes preview candidate when present). */
export function computeContentWidthMm(
  shelves: PlanogramShelf[],
  previewItem?: Pick<PlanogramItem, "x" | "width" | "facingsWide">,
  minWidth = MIN_SHELF_WIDTH_MM,
): number {
  let maxRight = 0;

  for (const shelf of shelves) {
    for (const item of shelf.items) {
      maxRight = Math.max(maxRight, item.x + itemFootprintWidth(item));
    }
  }

  if (previewItem) {
    maxRight = Math.max(maxRight, previewItem.x + itemFootprintWidth(previewItem));
  }

  return maxRight > 0 ? maxRight : minWidth;
}

function computeBounds(
  shelfLayouts: ShelfLayout[],
  itemRects: RectMm[],
  contentWidthMm: number,
): RectMm {
  if (shelfLayouts.length === 0) {
    return { x: 0, y: 0, width: MIN_SHELF_WIDTH_MM, height: 0 };
  }

  const minRowTop = Math.min(...shelfLayouts.map((shelf) => shelf.rowTopMm));
  const maxShelfY = Math.max(...shelfLayouts.map((shelf) => shelf.yMm));
  const minItemTop =
    itemRects.length > 0
      ? Math.min(...itemRects.map((rect) => rect.y))
      : minRowTop;
  const maxBottom = Math.max(
    maxShelfY,
    ...(itemRects.length > 0
      ? itemRects.map((rect) => rect.y + rect.height)
      : [maxShelfY]),
  );
  const topMm = Math.min(minItemTop, minRowTop);

  return {
    x: 0,
    y: topMm,
    width: contentWidthMm,
    height: maxBottom - topMm,
  };
}

/** Positioned shelves, optionally including a preview/candidate item. */
export function positionedShelves(
  shelves: PlanogramShelf[],
  config: PlanogramConfig,
  preview?: { shelfId: string; item: LayoutPreviewItem },
): PlanogramShelf[] {
  const source = preview
    ? withCandidateOnShelf(shelves, preview.shelfId, preview.item)
    : shelves;

  return computeShelfPositions(source, config);
}

export function computeItemRectOnShelf(
  item: Pick<PlanogramItem, "x" | "width" | "height" | "stackIndex" | "facingsWide">,
  shelf: PlanogramShelf,
  shelfItems: PlanogramItem[],
  config: PlanogramConfig,
): RectMm {
  return computeItemRect(
    item,
    shelf.yMm,
    config,
    stackHeightBelow(shelfItems, item, config),
  );
}

export function computePlanogramLayout(
  state: PlanogramState,
  previewItem?: LayoutPreviewItem,
): PlanogramLayout {
  const preview = previewItem
    ? { shelfId: previewItem.shelfId, item: previewItem }
    : undefined;
  const positioned = positionedShelves(state.shelves, state.config, preview);
  const shelfLayouts = buildShelfLayouts(positioned, state.config);
  const positionedById = new Map(positioned.map((shelf) => [shelf.id, shelf]));
  const previewShelfItems = preview
    ? withCandidateOnShelf(state.shelves, preview.shelfId, preview.item).find(
        (shelf) => shelf.id === preview.shelfId,
      )!.items
    : [];

  const committedRects: RectMm[] = [];
  const items = state.shelves.flatMap((shelf) => {
    const positionedShelf = positionedById.get(shelf.id);
    if (!positionedShelf) return [];

    return shelf.items.map((item) => {
      const rect = computeItemRectOnShelf(
        item,
        positionedShelf,
        shelf.items,
        state.config,
      );
      committedRects.push(rect);

      return {
        itemId: item.id,
        shelfId: shelf.id,
        skuId: item.skuId,
        stackIndex: item.stackIndex,
        rect,
        valid: true,
      };
    });
  });

  const heightRects = [...committedRects];
  if (previewItem) {
    const positionedShelf = positionedById.get(previewItem.shelfId)!;
    heightRects.push(
      computeItemRectOnShelf(
        previewItem,
        positionedShelf,
        previewShelfItems,
        state.config,
      ),
    );
  }

  const contentWidthMm = computeContentWidthMm(
    state.shelves,
    previewItem,
  );

  return {
    shelves: shelfLayouts,
    items,
    contentWidthMm,
    bounds: computeBounds(shelfLayouts, heightRects, contentWidthMm),
  };
}
