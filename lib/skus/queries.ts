import { prisma } from "../prisma";
import { QueryResult } from "../result";

export type Sku = {
    id: string;
    name: string
    sku: string
    width: number
    height: number
    imageUrl: string | null
    createdAt: Date;
    updatedAt: Date;
}

export async function getSkus(): Promise<QueryResult<Sku[]>> {
    try {
        const skus = await prisma.sKU.findMany();
        return { ok: true, data: skus.map((sku) => ({
            id: sku.id,
            name: sku.name,
            sku: sku.sku,
            width: sku.width,
            height: sku.height,
            imageUrl: sku.imageUrl,
            createdAt: sku.createdAt,
            updatedAt: sku.updatedAt,
        })) };
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
    imageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export async function getSku(id: string): Promise<QueryResult<SkuDetail>> {
    try {
        const sku = await prisma.sKU.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                sku: true,
                width: true,
                height: true,
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