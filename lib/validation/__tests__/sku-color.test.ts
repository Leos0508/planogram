import { describe, expect, it } from "vitest";
import {
  isValidSkuColor,
  normalizeSkuColor,
  randomSkuColor,
  resolveCreateSkuColor,
  skuColorFromKey,
  SKU_COLOR_PALETTE,
} from "@/lib/validation/sku";

describe("normalizeSkuColor", () => {
  it("accepts #rrggbb and lowercases", () => {
    expect(normalizeSkuColor("#AABBCC")).toBe("#aabbcc");
    expect(normalizeSkuColor("aabbcc")).toBe("#aabbcc");
  });

  it("rejects empty, short, or non-hex values", () => {
    expect(normalizeSkuColor("")).toBeNull();
    expect(normalizeSkuColor(null)).toBeNull();
    expect(normalizeSkuColor("#fff")).toBeNull();
    expect(normalizeSkuColor("#gg0000")).toBeNull();
    expect(normalizeSkuColor("red")).toBeNull();
  });
});

describe("isValidSkuColor", () => {
  it("mirrors normalizeSkuColor", () => {
    expect(isValidSkuColor("#22c55e")).toBe(true);
    expect(isValidSkuColor("nope")).toBe(false);
  });
});

describe("randomSkuColor", () => {
  it("returns a palette color from the random source", () => {
    expect(randomSkuColor(() => 0)).toBe(SKU_COLOR_PALETTE[0]);
    expect(randomSkuColor(() => 0.999)).toBe(
      SKU_COLOR_PALETTE[SKU_COLOR_PALETTE.length - 1],
    );
  });
});

describe("resolveCreateSkuColor", () => {
  it("persists a provided color after normalize", () => {
    expect(resolveCreateSkuColor("#AABBCC")).toBe("#aabbcc");
  });

  it("falls back to a random palette color when unset", () => {
    expect(resolveCreateSkuColor(undefined, () => 0)).toBe(SKU_COLOR_PALETTE[0]);
    expect(resolveCreateSkuColor("", () => 0.5)).toBe(
      SKU_COLOR_PALETTE[Math.floor(0.5 * SKU_COLOR_PALETTE.length)],
    );
  });
});

describe("skuColorFromKey", () => {
  it("is stable for the same key and varies across keys", () => {
    expect(skuColorFromKey("CAN-250")).toBe(skuColorFromKey("CAN-250"));
    expect(skuColorFromKey("CAN-250")).not.toBe(skuColorFromKey("PET-500"));
  });
});
