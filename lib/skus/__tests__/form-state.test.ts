import {
  derivedFacePreview,
  emptyForm,
  formFromSku,
  livePackagingFromForm,
  packagingInputFromForm,
  parseForm,
} from "@/lib/skus/form-state";
import { describe, expect, it } from "vitest";

describe("form-state packaging helpers", () => {
  it("emptyForm defaults to flat shape", () => {
    const form = emptyForm();
    expect(form.shape).toBe("NONE");
    expect(form.bodyDiameterMm).toBe("");
  });

  it("formFromSku hydrates can packaging", () => {
    const form = formFromSku({
      id: "1",
      name: "Cola",
      sku: "COLA-330",
      width: 66,
      height: 115,
      color: "#ff0000",
      imageUrl: null,
      shape: "CAN",
      packaging: {
        bodyDiameterMm: 66,
        heightMm: 115,
        endDiameterMm: 54,
        baseDiameterMm: 50,
        capacityMl: 330,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(form.shape).toBe("CAN");
    expect(form.bodyDiameterMm).toBe("66");
    expect(form.endDiameterMm).toBe("54");
    expect(form.capacityMl).toBe("330");
  });

  it("derivedFacePreview and livePackagingFromForm stay in sync", () => {
    const values = {
      ...emptyForm(),
      shape: "BOTTLE" as const,
      bodyDiameterMm: "70",
      heightMm: "220",
      neckDiameterMm: "28",
      baseDiameterMm: "55",
      color: "#112233",
      name: "Water",
      sku: "W-1",
    };
    const face = derivedFacePreview(values);
    const live = livePackagingFromForm(values);
    expect(face).toEqual({ width: "70", height: "220" });
    expect(live.ok).toBe(true);
    if (live.ok) {
      expect(live.face).toEqual({ width: 70, height: 220 });
      expect(live.data.shape).toBe("BOTTLE");
    }
  });

  it("parseForm rejects invalid can end diameter", () => {
    const result = parseForm({
      ...emptyForm(),
      name: "Bad",
      sku: "BAD",
      color: "#aabbcc",
      shape: "CAN",
      bodyDiameterMm: "66",
      heightMm: "115",
      endDiameterMm: "80",
      baseDiameterMm: "50",
    });
    expect(result.ok).toBe(false);
  });

  it("parseForm accepts valid bottle packaging", () => {
    const result = parseForm({
      ...emptyForm(),
      name: "Water",
      sku: "W-1",
      color: "#112233",
      shape: "BOTTLE",
      bodyDiameterMm: "70",
      heightMm: "220",
      neckDiameterMm: "28",
      baseDiameterMm: "55",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.width).toBe(70);
      expect(result.data.height).toBe(220);
      expect(result.data.shape).toBe("BOTTLE");
      expect(packagingInputFromForm({
        ...emptyForm(),
        shape: "BOTTLE",
        bodyDiameterMm: "70",
        heightMm: "220",
        neckDiameterMm: "28",
        baseDiameterMm: "55",
      })).toMatchObject({
        bodyDiameterMm: "70",
        neckDiameterMm: "28",
      });
    }
  });
});
