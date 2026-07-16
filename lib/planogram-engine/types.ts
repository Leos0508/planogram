/** All engine math uses millimeters unless noted otherwise. */

export type PointMm = {
  x: number;
  y: number;
};

export type RectMm = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Persisted placement — maps to PlanogramItem in DB. */
export type PlanogramItem = {
  id: string;
  shelfId: string;
  skuId: string;
  x: number;
  width: number;
  height: number;
  /** Bottom edge offset above shelf line (mm). 0 = resting on shelf. */
  y: number;
  /** Number of unit widths placed side-by-side on the shelf. */
  facingsWide: number;
};

export type PlanogramShelf = {
  id: string;
  index: number;
  /** User-set minimum item-area height (mm). */
  minContentHeightMm: number;
  /** User-set minimum fixture width (mm). Drag right edge to resize. */
  minContentWidthMm: number;
  /** Shelf line Y in mm — derived from stacked layout. */
  yMm: number;
  items: PlanogramItem[];
};

export type PlanogramConfig = {
  topClearance: number;
  stackGap: number;
};

/** Full in-memory document the engine operates on. */
export type PlanogramState = {
  id: string;
  config: PlanogramConfig;
  shelves: PlanogramShelf[];
};

/** Derived geometry for rendering and hit-testing. */
export type ItemRect = {
  itemId: string;
  shelfId: string;
  skuId: string;
  y: number;
  rect: RectMm;
  valid: boolean;
};

export type ShelfLayout = {
  shelfId: string;
  index: number;
  yMm: number;
  /** Top of this shelf row (includes topClearance band). */
  rowTopMm: number;
  /** Item footprint area height below the topClearance band. */
  contentHeightMm: number;
  /** Full row height: topClearance + contentHeightMm. */
  rowHeightMm: number;
};

export type PlanogramLayout = {
  shelves: ShelfLayout[];
  items: ItemRect[];
  bounds: RectMm;
  /** Canvas/shelf width from committed items only (mm). */
  contentWidthMm: number;
};

export type DropReason = "NO_SHELF" | "COLLISION" | "OUT_OF_BAND";

export type DropProjection =
  | {
      ok: true;
      shelfId: string;
      x: number;
      y: number;
      previewRect: RectMm;
    }
  | {
      ok: false;
      reason: DropReason;
      shelfId?: string;
      x?: number;
      y?: number;
      previewRect?: RectMm;
    };

export type CanPlaceResult =
  | { ok: true }
  | { ok: false; reason: DropReason };
