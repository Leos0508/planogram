"use server";

import { delIfOwnedSkuBlob, putSkuImage, validateSkuImageFile } from "@/lib/blob/sku-image";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/result";
import { isValidSkuFootprint } from "@/lib/validation/sku";
import {
  findSkuInWorkspace,
  requireWorkspaceWrite,
} from "@/lib/workspaces/current";
import { revalidatePath } from "next/cache";

export type SkuRecord = {
  id: string;
  name: string;
  sku: string;
  width: number;
  height: number;
  imageUrl: string | null;
};

function normalizeImageUrl(imageUrl?: string | null): string | null {
  const trimmed = imageUrl?.trim() ?? "";
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function validateSkuInput(input: {
  name: string;
  sku: string;
  width: number;
  height: number;
  imageUrl?: string | null;
}): string | null {
  const name = input.name.trim();
  const code = input.sku.trim();

  if (!name) return "Name is required";
  if (!code) return "SKU code is required";
  if (!isValidSkuFootprint(input.width, input.height)) {
    return "Width and height must be positive numbers (mm)";
  }

  if (
    input.imageUrl !== undefined &&
    input.imageUrl !== null &&
    input.imageUrl.trim() !== "" &&
    normalizeImageUrl(input.imageUrl) === null
  ) {
    return "Image URL must be a valid http(s) URL";
  }

  return null;
}

export async function uploadSkuImage(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Image file is required" };
    }

    const validationError = validateSkuImageFile(file);
    if (validationError) return { ok: false, message: validationError };

    const { url } = await putSkuImage(access.workspace.id, file);
    return { ok: true, data: { url } };
  } catch (error) {
    console.error("[uploadSkuImage]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to upload image";
    return { ok: false, message };
  }
}

export async function createSku(input: {
  name: string;
  sku: string;
  width: number;
  height: number;
  imageUrl?: string | null;
}): Promise<ActionResult<SkuRecord>> {
  const error = validateSkuInput(input);
  if (error) return { ok: false, message: error };

  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const created = await prisma.sKU.create({
      data: {
        workspaceId: access.workspace.id,
        name: input.name.trim(),
        sku: input.sku.trim(),
        width: Math.round(input.width),
        height: Math.round(input.height),
        imageUrl: normalizeImageUrl(input.imageUrl),
      },
    });

    revalidatePath("/skus");
    revalidatePath("/planograms");
    return { ok: true, data: created };
  } catch (error) {
    console.error("[createSku]", error);
    return {
      ok: false,
      message: "Failed to create SKU. Code may already exist.",
    };
  }
}

export async function updateSku(input: {
  id: string;
  name: string;
  sku: string;
  width: number;
  height: number;
  imageUrl?: string | null;
}): Promise<ActionResult<SkuRecord>> {
  const error = validateSkuInput(input);
  if (error) return { ok: false, message: error };

  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const existing = await findSkuInWorkspace(input.id, access.workspace.id);
    if (!existing) return { ok: false, message: "SKU not found" };

    const nextImageUrl = normalizeImageUrl(input.imageUrl);
    const previousImageUrl = existing.imageUrl;

    const updated = await prisma.sKU.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        sku: input.sku.trim(),
        width: Math.round(input.width),
        height: Math.round(input.height),
        imageUrl: nextImageUrl,
      },
    });

    if (previousImageUrl && previousImageUrl !== nextImageUrl) {
      await delIfOwnedSkuBlob(previousImageUrl, access.workspace.id);
    }

    revalidatePath("/skus");
    revalidatePath("/planograms");
    return { ok: true, data: updated };
  } catch (error) {
    console.error("[updateSku]", error);
    return {
      ok: false,
      message: "Failed to update SKU. Code may already exist.",
    };
  }
}

export async function deleteSku(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const sku = await prisma.sKU.findFirst({
      where: { id: input.id, workspaceId: access.workspace.id },
      include: { _count: { select: { planogramItems: true } } },
    });

    if (!sku) return { ok: false, message: "SKU not found" };
    if (sku._count.planogramItems > 0) {
      return {
        ok: false,
        message: "Cannot delete SKU that is used on a planogram",
      };
    }

    await prisma.sKU.delete({ where: { id: input.id } });
    await delIfOwnedSkuBlob(sku.imageUrl, access.workspace.id);

    revalidatePath("/skus");
    revalidatePath("/planograms");
    return { ok: true, data: { id: input.id } };
  } catch (error) {
    console.error("[deleteSku]", error);
    return { ok: false, message: "Failed to delete SKU" };
  }
}
