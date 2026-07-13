"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/result";
import { isValidSkuFootprint } from "@/lib/validation/sku";
import { revalidatePath } from "next/cache";

export type PlanogramItemRecord = {
  id: string;
  planogramShelfId: string;
  skuId: string;
  x: number;
  width: number;
  height: number;
  y: number;
  facingsWide: number;
};

async function shelfBelongsToPlanogram(shelfId: string, planogramId: string) {
  return prisma.planogramShelf.findFirst({
    where: { id: shelfId, planogramId },
    select: { id: true },
  });
}

export async function placePlanogramItem(input: {
  planogramId: string;
  shelfId: string;
  skuId: string;
  x: number;
  y: number;
  facingsWide?: number;
}): Promise<ActionResult<PlanogramItemRecord>> {
  try {
    const shelf = await shelfBelongsToPlanogram(input.shelfId, input.planogramId);
    if (!shelf) {
      return { ok: false, message: "Shelf not found" };
    }

    const sku = await prisma.sKU.findUnique({
      where: { id: input.skuId },
      select: { id: true, width: true, height: true },
    });
    if (!sku) {
      return { ok: false, message: "SKU not found" };
    }
    if (!isValidSkuFootprint(sku.width, sku.height)) {
      return { ok: false, message: "SKU must have a valid width and height" };
    }

    const item = await prisma.planogramItem.create({
      data: {
        planogramShelfId: input.shelfId,
        skuId: input.skuId,
        x: Math.round(input.x),
        width: sku.width,
        height: sku.height,
        y: input.y,
        facingsWide: Math.min(99, Math.max(1, Math.floor(input.facingsWide ?? 1))),
      },
    });

    return { ok: true, data: item };
  } catch (error) {
    console.error("[placePlanogramItem]", error);
    return { ok: false, message: "Failed to place item" };
  }
}

export async function removePlanogramItem(input: {
  planogramId: string;
  itemId: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const item = await prisma.planogramItem.findUnique({
      where: { id: input.itemId },
      include: {
        planogramShelf: { select: { planogramId: true } },
      },
    });

    if (!item || item.planogramShelf.planogramId !== input.planogramId) {
      return { ok: false, message: "Item not found" };
    }

    await prisma.planogramItem.delete({ where: { id: input.itemId } });

    return { ok: true, data: { id: input.itemId } };
  } catch (error) {
    console.error("[removePlanogramItem]", error);
    return { ok: false, message: "Failed to remove item" };
  }
}

export async function updatePlanogramItemPosition(input: {
  planogramId: string;
  itemId: string;
  shelfId: string;
  x: number;
  y: number;
}): Promise<ActionResult<PlanogramItemRecord>> {
  try {
    const item = await prisma.planogramItem.findUnique({
      where: { id: input.itemId },
      include: {
        planogramShelf: { select: { planogramId: true } },
      },
    });

    if (!item || item.planogramShelf.planogramId !== input.planogramId) {
      return { ok: false, message: "Item not found" };
    }

    const shelf = await shelfBelongsToPlanogram(input.shelfId, input.planogramId);
    if (!shelf) {
      return { ok: false, message: "Shelf not found" };
    }

    const updated = await prisma.planogramItem.update({
      where: { id: input.itemId },
      data: {
        planogramShelfId: input.shelfId,
        x: Math.round(input.x),
        y: input.y,
      },
    });

    return { ok: true, data: updated };
  } catch (error) {
    console.error("[updatePlanogramItemPosition]", error);
    return { ok: false, message: "Failed to update item position" };
  }
}

export async function updatePlanogramItemFacings(input: {
  planogramId: string;
  itemId: string;
  facingsWide: number;
}): Promise<ActionResult<PlanogramItemRecord>> {
  try {
    const facingsWide = Math.min(
      99,
      Math.max(1, Math.floor(input.facingsWide)),
    );

    const item = await prisma.planogramItem.findUnique({
      where: { id: input.itemId },
      include: {
        planogramShelf: { select: { planogramId: true } },
      },
    });

    if (!item || item.planogramShelf.planogramId !== input.planogramId) {
      return { ok: false, message: "Item not found" };
    }

    const updated = await prisma.planogramItem.update({
      where: { id: input.itemId },
      data: { facingsWide },
    });

    return { ok: true, data: updated };
  } catch (error) {
    console.error("[updatePlanogramItemFacings]", error);
    return { ok: false, message: "Failed to update facings" };
  }
}

export type PlanogramRecord = {
  id: string;
  name: string;
  topClearance: number;
  stackGap: number;
};

export type PlanogramShelfRecord = {
  id: string;
  planogramId: string;
  index: number;
  minContentHeightMm: number;
};

const DEFAULT_SHELF_COUNT = 3;
const DEFAULT_TOP_CLEARANCE_MM = 100;
const DEFAULT_STACK_GAP_MM = 10;

export async function createPlanogram(input: {
  name: string;
  shelfCount?: number;
  topClearance?: number;
  stackGap?: number;
}): Promise<ActionResult<PlanogramRecord>> {
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Name is required" };

  const shelfCount = input.shelfCount ?? DEFAULT_SHELF_COUNT;
  if (shelfCount < 1 || shelfCount > 20) {
    return { ok: false, message: "Shelf count must be between 1 and 20" };
  }

  const topClearance = input.topClearance ?? DEFAULT_TOP_CLEARANCE_MM;
  const stackGap = input.stackGap ?? DEFAULT_STACK_GAP_MM;
  if (topClearance < 0 || stackGap < 0) {
    return { ok: false, message: "Clearance and gap must be non-negative" };
  }

  try {
    const planogram = await prisma.planogram.create({
      data: {
        name,
        topClearance: Math.round(topClearance),
        stackGap: Math.round(stackGap),
        shelves: {
          create: Array.from({ length: shelfCount }, (_, index) => ({ index })),
        },
      },
    });

    revalidatePath("/planograms");
    return {
      ok: true,
      data: {
        id: planogram.id,
        name: planogram.name,
        topClearance: planogram.topClearance,
        stackGap: planogram.stackGap,
      },
    };
  } catch (error) {
    console.error("[createPlanogram]", error);
    return { ok: false, message: "Failed to create planogram" };
  }
}

export async function updatePlanogram(input: {
  id: string;
  name: string;
  topClearance: number;
  stackGap: number;
}): Promise<ActionResult<PlanogramRecord>> {
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Name is required" };
  if (input.topClearance < 0 || input.stackGap < 0) {
    return { ok: false, message: "Clearance and gap must be non-negative" };
  }

  try {
    const existing = await prisma.planogram.findUnique({
      where: { id: input.id },
    });
    if (!existing) return { ok: false, message: "Planogram not found" };

    const updated = await prisma.planogram.update({
      where: { id: input.id },
      data: {
        name,
        topClearance: Math.round(input.topClearance),
        stackGap: Math.round(input.stackGap),
      },
    });

    revalidatePath("/planograms");
    revalidatePath(`/planograms/${input.id}`);
    return { ok: true, data: updated };
  } catch (error) {
    console.error("[updatePlanogram]", error);
    return { ok: false, message: "Failed to update planogram" };
  }
}

export async function deletePlanogram(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const planogram = await prisma.planogram.findUnique({
      where: { id: input.id },
      include: { shelves: { select: { id: true } } },
    });
    if (!planogram) return { ok: false, message: "Planogram not found" };

    const shelfIds = planogram.shelves.map((shelf) => shelf.id);

    await prisma.$transaction([
      prisma.planogramItem.deleteMany({
        where: { planogramShelfId: { in: shelfIds } },
      }),
      prisma.planogramShelf.deleteMany({ where: { planogramId: input.id } }),
      prisma.planogram.delete({ where: { id: input.id } }),
    ]);

    revalidatePath("/planograms");
    return { ok: true, data: { id: input.id } };
  } catch (error) {
    console.error("[deletePlanogram]", error);
    return { ok: false, message: "Failed to delete planogram" };
  }
}

export async function addPlanogramShelf(input: {
  planogramId: string;
}): Promise<ActionResult<PlanogramShelfRecord>> {
  try {
    const planogram = await prisma.planogram.findUnique({
      where: { id: input.planogramId },
      include: {
        shelves: { orderBy: { index: "desc" }, take: 1 },
      },
    });
    if (!planogram) return { ok: false, message: "Planogram not found" };

    const nextIndex = (planogram.shelves[0]?.index ?? -1) + 1;
    if (nextIndex >= 20) {
      return { ok: false, message: "Maximum of 20 shelves reached" };
    }

    const shelf = await prisma.planogramShelf.create({
      data: {
        planogramId: input.planogramId,
        index: nextIndex,
      },
    });

    revalidatePath(`/planograms/${input.planogramId}`);
    revalidatePath("/planograms");
    return { ok: true, data: shelf };
  } catch (error) {
    console.error("[addPlanogramShelf]", error);
    return { ok: false, message: "Failed to add shelf" };
  }
}

export async function updatePlanogramShelfMinHeight(input: {
  planogramId: string;
  shelfId: string;
  minContentHeightMm: number;
}): Promise<ActionResult<PlanogramShelfRecord>> {
  const minContentHeightMm = Math.round(input.minContentHeightMm);
  if (minContentHeightMm < 1) {
    return { ok: false, message: "Shelf height must be at least 1 mm" };
  }

  try {
    const shelf = await prisma.planogramShelf.findFirst({
      where: { id: input.shelfId, planogramId: input.planogramId },
    });
    if (!shelf) return { ok: false, message: "Shelf not found" };

    const updated = await prisma.planogramShelf.update({
      where: { id: input.shelfId },
      data: { minContentHeightMm },
    });

    revalidatePath(`/planograms/${input.planogramId}`);
    return { ok: true, data: updated };
  } catch (error) {
    console.error("[updatePlanogramShelfMinHeight]", error);
    return { ok: false, message: "Failed to update shelf height" };
  }
}

export async function removePlanogramShelf(input: {
  planogramId: string;
  shelfId: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const shelf = await prisma.planogramShelf.findFirst({
      where: { id: input.shelfId, planogramId: input.planogramId },
      include: { _count: { select: { planogramShelfItems: true } } },
    });
    if (!shelf) return { ok: false, message: "Shelf not found" };
    if (shelf._count.planogramShelfItems > 0) {
      return { ok: false, message: "Remove all items from the shelf first" };
    }

    const remaining = await prisma.planogramShelf.findMany({
      where: { planogramId: input.planogramId },
      orderBy: { index: "asc" },
    });
    if (remaining.length <= 1) {
      return { ok: false, message: "Planogram must have at least one shelf" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.planogramShelf.delete({ where: { id: input.shelfId } });

      const sorted = remaining
        .filter((row) => row.id !== input.shelfId)
        .sort((a, b) => a.index - b.index);

      for (const [index, row] of sorted.entries()) {
        if (row.index !== index) {
          await tx.planogramShelf.update({
            where: { id: row.id },
            data: { index },
          });
        }
      }
    });

    revalidatePath(`/planograms/${input.planogramId}`);
    revalidatePath("/planograms");
    return { ok: true, data: { id: input.shelfId } };
  } catch (error) {
    console.error("[removePlanogramShelf]", error);
    return { ok: false, message: "Failed to remove shelf" };
  }
}
