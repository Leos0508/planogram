import type { PrismaClient } from "@/generated/prisma/client";
import {
  packagingFromFaceOn,
  resolveSkuDimensions,
  type SkuShape,
} from "@/lib/skus/packaging";
import { skuColorFromKey } from "@/lib/validation/sku";

type SeedFaceRow = {
  sku: string;
  name: string;
  width: number;
  height: number;
  shape: SkuShape;
  capacityMl: number;
};

/**
 * First-run catalog: industry-ish face-on footprints (mm) + parametric packaging.
 * Spec sources: `docs/SEED_SKU_SPECS.md`.
 */
const SEED_FACE_ROWS: readonly SeedFaceRow[] = [
  {
    sku: "CAN-250-SLIM",
    name: "Slim can 250 ml",
    width: 53,
    height: 134,
    shape: "CAN",
    capacityMl: 250,
  },
  {
    sku: "CAN-250",
    name: "Standard can 250 ml",
    width: 58,
    height: 104,
    shape: "CAN",
    capacityMl: 250,
  },
  {
    sku: "CAN-330",
    name: "Standard can 330 ml",
    width: 66,
    height: 115,
    shape: "CAN",
    capacityMl: 330,
  },
  {
    sku: "CAN-355",
    name: "Standard can 355 ml",
    width: 66,
    height: 122,
    shape: "CAN",
    capacityMl: 355,
  },
  {
    sku: "CAN-500",
    name: "Tall can 500 ml",
    width: 67,
    height: 168,
    shape: "CAN",
    capacityMl: 500,
  },
  {
    sku: "PET-500",
    name: "PET bottle 500 ml",
    width: 65,
    height: 210,
    shape: "BOTTLE",
    capacityMl: 500,
  },
  {
    sku: "PET-1000",
    name: "PET bottle 1 L",
    width: 80,
    height: 270,
    shape: "BOTTLE",
    capacityMl: 1000,
  },
  {
    sku: "GLASS-330",
    name: "Glass bottle 330 ml",
    width: 60,
    height: 230,
    shape: "BOTTLE",
    capacityMl: 330,
  },
] as const;

function buildSeedCatalogSku(row: SeedFaceRow) {
  const packaging = packagingFromFaceOn(
    row.shape,
    { width: row.width, height: row.height },
    row.capacityMl,
  );
  const resolved = resolveSkuDimensions({
    width: row.width,
    height: row.height,
    shape: row.shape,
    packaging,
  });
  if (!resolved.ok || resolved.shape == null || resolved.packaging == null) {
    throw new Error(
      `Invalid seed packaging for ${row.sku}: ${
        resolved.ok ? "missing shape/packaging" : resolved.message
      }`,
    );
  }
  if (resolved.width !== row.width || resolved.height !== row.height) {
    throw new Error(
      `Seed ${row.sku} face-on mismatch: expected ${row.width}×${row.height}, got ${resolved.width}×${resolved.height}`,
    );
  }
  return {
    sku: row.sku,
    name: row.name,
    width: resolved.width,
    height: resolved.height,
    shape: resolved.shape,
    packaging: resolved.packaging,
  };
}

export const SEED_CATALOG_SKUS = SEED_FACE_ROWS.map(buildSeedCatalogSku);

export type SeedCatalogResult =
  | { seeded: false; reason: "already_populated"; count: number }
  | { seeded: true; count: number };

/**
 * Insert seed SKUs when the workspace catalog is empty.
 * Idempotent: no-ops if any SKU already exists for the workspace.
 */
export async function seedCatalogForWorkspace(
  db: PrismaClient,
  workspaceId: string,
): Promise<SeedCatalogResult> {
  const count = await db.sKU.count({ where: { workspaceId } });
  if (count > 0) {
    return { seeded: false, reason: "already_populated", count };
  }

  const result = await db.sKU.createMany({
    data: SEED_CATALOG_SKUS.map((row) => ({
      workspaceId,
      sku: row.sku,
      name: row.name,
      width: row.width,
      height: row.height,
      shape: row.shape,
      packaging: row.packaging,
      color: skuColorFromKey(row.sku),
    })),
    skipDuplicates: true,
  });

  return { seeded: true, count: result.count };
}
