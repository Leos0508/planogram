/**
 * Thin read adapter: PlanogramLayout + state + SKUs → 3D scene descriptors.
 * Does not change the placement engine API (Plan 02 D10 / PLA-9).
 *
 * Scene coords: mm, Y up, X matches planogram X, Z is shelf depth (into bay).
 * Planogram Y-down maps as sceneY = -planogramY so upper shelves sit higher.
 */

import type {
  PlanogramLayout,
  PlanogramState,
} from "@/lib/planogram-engine/types";
import {
  readStoredPackaging,
  type SkuPackaging,
  type SkuShape,
} from "@/lib/skus/packaging";

/** Shelf board thickness (mm). */
export const SHELF_BOARD_THICKNESS_MM = 20;
/** Fixture depth along Z (mm). */
export const SHELF_DEPTH_MM = 400;
/** Bay backboard thickness (mm). */
export const BACKBOARD_THICKNESS_MM = 12;
/** Lift items above the shelf board to avoid z-fighting (mm). */
export const ITEM_SHELF_GAP_MM = 2;
/** Fallback box depth when SKU has no parametric packaging. */
export const DEFAULT_BOX_DEPTH_MM = 80;

export type SceneVec3 = { x: number; y: number; z: number };

export type SceneShelfBoard = {
  shelfId: string;
  /** Board center in scene mm. */
  position: SceneVec3;
  size: { width: number; height: number; depth: number };
};

/** Fixture back panel behind all shelves. */
export type SceneBackdrop = {
  position: SceneVec3;
  size: { width: number; height: number; depth: number };
};

export type SceneItemMesh =
  | {
      kind: "packaging";
      packaging: SkuPackaging;
    }
  | {
      kind: "box";
      width: number;
      height: number;
      depth: number;
    };

export type SceneItem = {
  /** Stable key: `${itemId}:${facingIndex}`. */
  key: string;
  itemId: string;
  skuId: string;
  color: string;
  /**
   * Placement origin: packaging = base center; box = base center
   * (renderer offsets BoxGeometry by +height/2).
   */
  position: SceneVec3;
  mesh: SceneItemMesh;
};

export type Planogram3DScene = {
  shelves: SceneShelfBoard[];
  /** Bay backboard, or null when there are no shelves. */
  backdrop: SceneBackdrop | null;
  items: SceneItem[];
  /** Axis-aligned extents for camera framing. */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
};

export type SceneSkuLookup = {
  color: string;
  width: number;
  height: number;
  shape: SkuShape | null;
  packaging: unknown;
};

function emptyBounds(): Planogram3DScene["bounds"] {
  return {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    minZ: -SHELF_DEPTH_MM - BACKBOARD_THICKNESS_MM,
    maxZ: 0,
  };
}

function expandBounds(
  bounds: Planogram3DScene["bounds"],
  x: number,
  y: number,
  z: number,
  halfW: number,
  halfH: number,
  halfD: number,
) {
  bounds.minX = Math.min(bounds.minX, x - halfW);
  bounds.maxX = Math.max(bounds.maxX, x + halfW);
  bounds.minY = Math.min(bounds.minY, y - halfH);
  bounds.maxY = Math.max(bounds.maxY, y + halfH);
  bounds.minZ = Math.min(bounds.minZ, z - halfD);
  bounds.maxZ = Math.max(bounds.maxZ, z + halfD);
}

/**
 * Build a read-only 3D scene from derived layout + live state (for facings).
 */
export function buildPlanogram3DScene(
  layout: PlanogramLayout,
  state: PlanogramState,
  skuById: ReadonlyMap<string, SceneSkuLookup>,
): Planogram3DScene {
  const itemById = new Map(
    state.shelves.flatMap((shelf) => shelf.items.map((item) => [item.id, item])),
  );

  const width = Math.max(layout.contentWidthMm, 1);
  const depth = SHELF_DEPTH_MM;
  const boardHeight = SHELF_BOARD_THICKNESS_MM;
  const shelfZ = -depth / 2;

  const shelves: SceneShelfBoard[] = layout.shelves.map((shelf) => {
    const topY = -shelf.yMm;
    const centerY = topY - boardHeight / 2;
    return {
      shelfId: shelf.shelfId,
      position: {
        x: width / 2,
        y: centerY,
        z: shelfZ,
      },
      size: {
        width,
        height: boardHeight,
        depth,
      },
    };
  });

  let backdrop: SceneBackdrop | null = null;
  if (layout.shelves.length > 0) {
    const topMm = Math.min(...layout.shelves.map((shelf) => shelf.rowTopMm));
    const bottomMm = Math.max(...layout.shelves.map((shelf) => shelf.yMm));
    const topY = -topMm;
    const bottomY = -bottomMm - boardHeight;
    const bayHeight = Math.max(topY - bottomY, boardHeight);
    backdrop = {
      position: {
        x: width / 2,
        y: (topY + bottomY) / 2,
        z: -depth - BACKBOARD_THICKNESS_MM / 2,
      },
      size: {
        width,
        height: bayHeight,
        depth: BACKBOARD_THICKNESS_MM,
      },
    };
  }

  const items: SceneItem[] = [];
  for (const layoutItem of layout.items) {
    const placed = itemById.get(layoutItem.itemId);
    if (!placed) continue;

    const sku = skuById.get(layoutItem.skuId);
    const color = sku?.color ?? "#a1a1aa";
    const unitWidth = placed.width;
    const unitHeight = placed.height;
    const facings = Math.max(1, placed.facingsWide);
    const packaging = sku
      ? readStoredPackaging(sku.shape, sku.packaging)
      : null;

    const baseY = -layoutItem.rect.y - unitHeight + ITEM_SHELF_GAP_MM;
    const itemZ = -Math.min(
      depth * 0.35,
      packaging ? packaging.bodyDiameterMm / 2 + 20 : DEFAULT_BOX_DEPTH_MM / 2 + 20,
    );

    for (let facing = 0; facing < facings; facing += 1) {
      const centerX = layoutItem.rect.x + (facing + 0.5) * unitWidth;
      const mesh: SceneItemMesh = packaging
        ? { kind: "packaging", packaging }
        : {
            kind: "box",
            width: unitWidth,
            height: unitHeight,
            depth: Math.min(DEFAULT_BOX_DEPTH_MM, unitWidth),
          };

      items.push({
        key: `${layoutItem.itemId}:${facing}`,
        itemId: layoutItem.itemId,
        skuId: layoutItem.skuId,
        color,
        position: { x: centerX, y: baseY, z: itemZ },
        mesh,
      });
    }
  }

  const bounds = emptyBounds();
  if (shelves.length === 0 && items.length === 0) {
    bounds.maxX = width;
    bounds.minY = -boardHeight;
    return { shelves, backdrop, items, bounds };
  }

  bounds.minX = Infinity;
  bounds.maxX = -Infinity;
  bounds.minY = Infinity;
  bounds.maxY = -Infinity;
  bounds.minZ = Infinity;
  bounds.maxZ = -Infinity;

  for (const shelf of shelves) {
    expandBounds(
      bounds,
      shelf.position.x,
      shelf.position.y,
      shelf.position.z,
      shelf.size.width / 2,
      shelf.size.height / 2,
      shelf.size.depth / 2,
    );
  }

  if (backdrop) {
    expandBounds(
      bounds,
      backdrop.position.x,
      backdrop.position.y,
      backdrop.position.z,
      backdrop.size.width / 2,
      backdrop.size.height / 2,
      backdrop.size.depth / 2,
    );
  }

  for (const item of items) {
    if (item.mesh.kind === "packaging") {
      const d = item.mesh.packaging.bodyDiameterMm;
      const h = item.mesh.packaging.heightMm;
      expandBounds(
        bounds,
        item.position.x,
        item.position.y + h / 2,
        item.position.z,
        d / 2,
        h / 2,
        d / 2,
      );
    } else {
      expandBounds(
        bounds,
        item.position.x,
        item.position.y + item.mesh.height / 2,
        item.position.z,
        item.mesh.width / 2,
        item.mesh.height / 2,
        item.mesh.depth / 2,
      );
    }
  }

  return { shelves, backdrop, items, bounds };
}
