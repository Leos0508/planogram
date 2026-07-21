import { describe, expect, it, vi } from "vitest";
import {
  deriveFaceOnMm,
  parseSkuPackaging,
  readStoredPackaging,
} from "@/lib/skus/packaging";
import {
  SEED_CATALOG_SKUS,
  seedCatalogForWorkspace,
} from "@/lib/skus/seed-catalog";
import { skuColorFromKey } from "@/lib/validation/sku";

describe("SEED_CATALOG_SKUS", () => {
  it("has 6–10 unique can/bottle codes with positive mm dims", () => {
    expect(SEED_CATALOG_SKUS.length).toBeGreaterThanOrEqual(6);
    expect(SEED_CATALOG_SKUS.length).toBeLessThanOrEqual(10);

    const codes = SEED_CATALOG_SKUS.map((row) => row.sku);
    expect(new Set(codes).size).toBe(codes.length);

    for (const row of SEED_CATALOG_SKUS) {
      expect(row.width).toBeGreaterThan(0);
      expect(row.height).toBeGreaterThan(0);
      expect(row.name.length).toBeGreaterThan(0);
    }
  });

  it("stores parametric shape + packaging that round-trip to face-on mm", () => {
    for (const row of SEED_CATALOG_SKUS) {
      expect(row.shape === "CAN" || row.shape === "BOTTLE").toBe(true);
      if (row.sku.startsWith("CAN-")) {
        expect(row.shape).toBe("CAN");
      } else {
        expect(row.shape).toBe("BOTTLE");
      }

      const parsed = parseSkuPackaging(row.shape, row.packaging);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      expect(deriveFaceOnMm(parsed.data)).toEqual({
        width: row.width,
        height: row.height,
      });
      expect(readStoredPackaging(row.shape, row.packaging)).toEqual(parsed.data);
    }
  });
});

describe("seedCatalogForWorkspace", () => {
  it("no-ops when the catalog already has SKUs", async () => {
    const db = {
      sKU: {
        count: vi.fn().mockResolvedValue(3),
        createMany: vi.fn(),
      },
    };

    const result = await seedCatalogForWorkspace(db as never, "ws-1");

    expect(result).toEqual({
      seeded: false,
      reason: "already_populated",
      count: 3,
    });
    expect(db.sKU.createMany).not.toHaveBeenCalled();
  });

  it("inserts seed rows when the catalog is empty", async () => {
    const db = {
      sKU: {
        count: vi.fn().mockResolvedValue(0),
        createMany: vi.fn().mockResolvedValue({ count: SEED_CATALOG_SKUS.length }),
      },
    };

    const result = await seedCatalogForWorkspace(db as never, "ws-1");

    expect(result).toEqual({
      seeded: true,
      count: SEED_CATALOG_SKUS.length,
    });
    expect(db.sKU.createMany).toHaveBeenCalledWith({
      data: SEED_CATALOG_SKUS.map((row) => ({
        workspaceId: "ws-1",
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
  });
});
