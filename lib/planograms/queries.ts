import { prisma } from "@/lib/prisma";
import type { QueryResult } from "@/lib/result";
import { requireWorkspace } from "@/lib/workspaces/current";

export type PlanogramListItem = {
  id: string;
  name: string;
  topClearance: number;
  stackGap: number;
  shelfCount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Fetches planograms for the current workspace (updatedAt desc).
 * Search / filter / sort stay client-side in `lib/planograms/filter.ts`.
 */
export async function getPlanograms(): Promise<
  QueryResult<PlanogramListItem[]>
> {
  try {
    const access = await requireWorkspace();
    if (!access.ok) {
      return { ok: false, code: "NOT_FOUND", message: access.message };
    }

    const rows = await prisma.planogram.findMany({
      where: { workspaceId: access.workspace.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        topClearance: true,
        stackGap: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { shelves: true } },
        shelves: {
          select: {
            _count: { select: { planogramShelfItems: true } },
          },
        },
      },
    });

    const planograms = rows.map(({ shelves, _count, ...planogram }) => ({
      ...planogram,
      shelfCount: _count.shelves,
      itemCount: shelves.reduce(
        (total, shelf) => total + shelf._count.planogramShelfItems,
        0,
      ),
    }));

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
      minContentHeightMm: number;
      minContentWidthMm: number;
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
    const access = await requireWorkspace();
    if (!access.ok) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Planogram not found",
      };
    }

    const planogram = await prisma.planogram.findFirst({
      where: { id, workspaceId: access.workspace.id },
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
          minContentHeightMm: shelf.minContentHeightMm,
          minContentWidthMm: shelf.minContentWidthMm,
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
