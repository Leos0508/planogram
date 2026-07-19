import { describe, expect, it } from "vitest";
import {
  planogramPdfExportFilename,
  slugifyPlanogramExportName,
} from "@/lib/planogram-export/filename";

describe("slugifyPlanogramExportName", () => {
  it("slugifies to lowercase kebab-case", () => {
    expect(slugifyPlanogramExportName("Demo Bay")).toBe("demo-bay");
    expect(slugifyPlanogramExportName("  Aisle 3 / Endcap ")).toBe(
      "aisle-3-endcap",
    );
  });

  it("returns empty string when nothing alphanumeric remains", () => {
    expect(slugifyPlanogramExportName("!!!")).toBe("");
    expect(slugifyPlanogramExportName("   ")).toBe("");
  });
});

describe("planogramPdfExportFilename", () => {
  it("uses planogram_<slug>.pdf", () => {
    expect(planogramPdfExportFilename("Demo Bay")).toBe(
      "planogram_demo-bay.pdf",
    );
  });

  it("falls back to planogram.pdf for empty slug", () => {
    expect(planogramPdfExportFilename("***")).toBe("planogram.pdf");
  });
});
