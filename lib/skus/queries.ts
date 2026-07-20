import { prisma } from "@/lib/prisma";
import type { QueryResult } from "@/lib/result";
import { seedCatalogForWorkspace } from "@/lib/skus/seed-catalog";
import { requireWorkspace } from "@/lib/workspaces/current";

export type Sku = {
  id: string;
  name: string;
  sku: string;
  width: number;
  height: number;
  color: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getSkus(): Promise<QueryResult<Sku[]>> {
  try {
    const access = await requireWorkspace();
    if (!access.ok) {
      return { ok: false, code: "NOT_FOUND", message: access.message };
    }

    await seedCatalogForWorkspace(prisma, access.workspace.id);

    const skus = await prisma.sKU.findMany({
      where: { workspaceId: access.workspace.id },
      orderBy: { updatedAt: "desc" },
    });

    return {
      ok: true,
      data: skus.map((sku) => ({
        id: sku.id,
        name: sku.name,
        sku: sku.sku,
        width: sku.width,
        height: sku.height,
        color: sku.color,
        imageUrl: sku.imageUrl,
        createdAt: sku.createdAt,
        updatedAt: sku.updatedAt,
      })),
    };
  } catch (error) {
    console.error("[getSkus]", error);
    return {
      ok: false,
      code: "DB_ERROR",
      message: "Failed to fetch skus",
    };
  }
}

export type SkuDetail = {
  id: string;
  name: string;
  sku: string;
  width: number;
  height: number;
  color: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getSku(id: string): Promise<QueryResult<SkuDetail>> {
  try {
    const access = await requireWorkspace();
    if (!access.ok) {
      return { ok: false, code: "NOT_FOUND", message: "Sku not found" };
    }

    const sku = await prisma.sKU.findFirst({
      where: { id, workspaceId: access.workspace.id },
      select: {
        id: true,
        name: true,
        sku: true,
        width: true,
        height: true,
        color: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!sku) {
      return { ok: false, code: "NOT_FOUND", message: "Sku not found" };
    }

    return { ok: true, data: sku };
  } catch (error) {
    console.error("[getSku]", error);
    return {
      ok: false,
      code: "DB_ERROR",
      message: "Failed to fetch sku",
    };
  }
}
