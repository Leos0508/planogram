import { describe, expect, it } from "vitest";
import {
  SKU_IMAGE_MAX_BYTES,
  buildSkuImagePathname,
  isOwnedSkuBlobUrl,
  sanitizeSkuImageFilename,
  validateSkuImageFile,
} from "@/lib/blob/sku-image-shared";

describe("validateSkuImageFile", () => {
  it("accepts jpeg/png/webp under 2 MB", () => {
    expect(
      validateSkuImageFile({ type: "image/jpeg", size: 1000, name: "a.jpg" }),
    ).toBeNull();
    expect(
      validateSkuImageFile({ type: "image/png", size: 1000, name: "a.png" }),
    ).toBeNull();
    expect(
      validateSkuImageFile({ type: "image/webp", size: 1000, name: "a.webp" }),
    ).toBeNull();
  });

  it("rejects other mime types", () => {
    expect(
      validateSkuImageFile({ type: "image/gif", size: 1000, name: "a.gif" }),
    ).toMatch(/JPEG, PNG, or WebP/i);
  });

  it("rejects empty and oversized files", () => {
    expect(
      validateSkuImageFile({ type: "image/png", size: 0, name: "a.png" }),
    ).toMatch(/empty/i);
    expect(
      validateSkuImageFile({
        type: "image/png",
        size: SKU_IMAGE_MAX_BYTES + 1,
        name: "a.png",
      }),
    ).toMatch(/2 MB/i);
  });
});

describe("sanitizeSkuImageFilename / buildSkuImagePathname", () => {
  it("sanitizes unsafe names", () => {
    expect(sanitizeSkuImageFilename("../../evil name!!.PNG")).toBe(
      "evil-name-.PNG",
    );
  });

  it("scopes pathname to workspace skus folder", () => {
    const path = buildSkuImagePathname("ws-1", "Widget Photo.png");
    expect(path.startsWith("workspaces/ws-1/skus/")).toBe(true);
    expect(path.endsWith("-Widget-Photo.png")).toBe(true);
  });
});

describe("isOwnedSkuBlobUrl", () => {
  const workspaceId = "ws-abc";
  const owned =
    "https://abc123.public.blob.vercel-storage.com/workspaces/ws-abc/skus/uuid-photo.png";

  it("accepts vercel blob urls under workspace prefix", () => {
    expect(isOwnedSkuBlobUrl(owned, workspaceId)).toBe(true);
  });

  it("rejects external urls and other workspaces", () => {
    expect(
      isOwnedSkuBlobUrl("https://cdn.example.com/photo.png", workspaceId),
    ).toBe(false);
    expect(
      isOwnedSkuBlobUrl(
        "https://abc123.public.blob.vercel-storage.com/workspaces/other/skus/x.png",
        workspaceId,
      ),
    ).toBe(false);
    expect(isOwnedSkuBlobUrl(null, workspaceId)).toBe(false);
  });
});
