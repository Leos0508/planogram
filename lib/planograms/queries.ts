import { prisma } from "@/lib/prisma";
import type { QueryResult } from "@/lib/result";

export type PlanogramListItem = {
  id: string;
  name: string;
  topClearance: number;
  stackGap: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function getPlanograms(): Promise<
  QueryResult<PlanogramListItem[]>
> {
  try {
    const planograms = await prisma.planogram.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        topClearance: true,
        stackGap: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ok: true, data: planograms };
  } catch (error) {
    console.error("[getPlanograms]", error);
    return {
      ok: false,
      code: "DB_ERROR",
      message: "Failed to fetch planograms",
    };
  }
}

export type PlanogramDetail = {
    id: string;
    name: string;
    topClearance: number;
    stackGap: number;
    shelves: Array<{
      id: string;
      index: number;
      items: Array<{
        id: string;
        skuId: string;
        x: number;
        width: number;
        height: number;
        y: number;
        facingsWide: number;
      }>;
    }>;
  };
  
export async function getPlanogram(
    id: string,
  ): Promise<QueryResult<PlanogramDetail>> {
    try {
      const planogram = await prisma.planogram.findUnique({
        where: { id },
        include: {
          shelves: {
            orderBy: { index: "asc" },
            include: {
              planogramShelfItems: {
                select: {
                  id: true,
                  skuId: true,
                  x: true,
                  width: true,
                  height: true,
                  y: true,
                  facingsWide: true,
                },
              },
            },
          },
        },
      });
  
      if (!planogram) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Planogram not found",
        };
      }
  
      return {
        ok: true,
        data: {
          id: planogram.id,
          name: planogram.name,
          topClearance: planogram.topClearance,
          stackGap: planogram.stackGap,
          shelves: planogram.shelves.map((shelf) => ({
            id: shelf.id,
            index: shelf.index,
            items: shelf.planogramShelfItems,
          })),
        },
      };
    } catch (error) {
      console.error("[getPlanogram]", error);
      return {
        ok: false,
        code: "DB_ERROR",
        message: "Failed to fetch planogram",
      };
    }
  }