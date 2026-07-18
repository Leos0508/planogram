import type { PrismaClient } from "@/generated/prisma/client";

/**
 * First-run catalog: industry-ish face-on footprints (mm).
 * Spec sources: `docs/SEED_SKU_SPECS.md`.
 */
export const SEED_CATALOG_SKUS = [
  {
    sku: "CAN-250-SLIM",
    name: "Slim can 250 ml",
    width: 53,
    height: 134,
  },
  {
    sku: "CAN-250",
    name: "Standard can 250 ml",
    width: 58,
    height: 104,
  },
  {
    sku: "CAN-330",
    name: "Standard can 330 ml",
    width: 66,
    height: 115,
  },
  {
    sku: "CAN-355",
    name: "Standard can 355 ml",
    width: 66,
    height: 122,
  },
  {
    sku: "CAN-500",
    name: "Tall can 500 ml",
    width: 67,
    height: 168,
  },
  {
    sku: "PET-500",
    name: "PET bottle 500 ml",
    width: 65,
    height: 210,
  },
  {
    sku: "PET-1000",
    name: "PET bottle 1 L",
    width: 80,
    height: 270,
  },
  {
    sku: "GLASS-330",
    name: "Glass bottle 330 ml",
    width: 60,
    height: 230,
  },
] as const;

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
    })),
    skipDuplicates: true,
  });

  return { seeded: true, count: result.count };
}
