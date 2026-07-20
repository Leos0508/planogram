import { describe, expect, it } from "vitest";
import {
  detectSkuImportFormat,
  parseSkuImport,
  parseSkuImportCsv,
  parseSkuImportJson,
  splitCsvLine,
} from "../import-parse";

describe("splitCsvLine", () => {
  it("splits plain fields", () => {
    expect(splitCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas inside quotes", () => {
    expect(splitCsvLine('"Cola, diet",SKU-1,60,120')).toEqual([
      "Cola, diet",
      "SKU-1",
      "60",
      "120",
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(splitCsvLine('"Say ""hi""",x')).toEqual(['Say "hi"', "x"]);
  });
});

describe("parseSkuImportCsv", () => {
  it("parses a happy-path CSV with optional color and imageUrl", () => {
    const csv = [
      "name,sku,width,height,color,imageUrl",
      "Cola 330,COLA-330,66,115,#ef4444,https://example.com/cola.png",
      "Water,WTR-01,65,210,,",
    ].join("\n");

    const result = parseSkuImportCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual([
      {
        sourceRow: 2,
        name: "Cola 330",
        sku: "COLA-330",
        width: 66,
        height: 115,
        color: "#ef4444",
        imageUrl: "https://example.com/cola.png",
      },
      {
        sourceRow: 3,
        name: "Water",
        sku: "WTR-01",
        width: 65,
        height: 210,
      },
    ]);
  });

  it("rejects bad dimensions with row-level messages", () => {
    const csv = [
      "name,sku,width,height",
      "Bad width,BAD-W,0,100",
      "Bad height,BAD-H,50,-1",
      "Ok,OK-1,40,80",
    ].join("\n");

    const result = parseSkuImportCsv(csv);
    expect(result.valid).toEqual([
      {
        sourceRow: 4,
        name: "Ok",
        sku: "OK-1",
        width: 40,
        height: 80,
      },
    ]);
    expect(result.errors).toEqual([
      {
        row: 2,
        message: "Width and height must be positive integers (mm)",
      },
      {
        row: 3,
        message: "Width and height must be positive integers (mm)",
      },
    ]);
  });

  it("rejects invalid color and image URL rows", () => {
    const csv = [
      "name,sku,width,height,color,imageUrl",
      "Bad color,BC-1,40,80,red,",
      "Bad url,BU-1,40,80,,ftp://example.com/x.png",
    ].join("\n");

    const result = parseSkuImportCsv(csv);
    expect(result.valid).toEqual([]);
    expect(result.errors).toEqual([
      { row: 2, message: "Color must be a valid hex value (#rrggbb)" },
      { row: 3, message: "Image URL must be a valid http(s) URL" },
    ]);
  });

  it("rejects duplicate SKU codes within the file", () => {
    const csv = [
      "name,sku,width,height",
      "First,DUP-1,40,80",
      "Second,DUP-1,50,90",
    ].join("\n");

    const result = parseSkuImportCsv(csv);
    expect(result.valid).toEqual([
      {
        sourceRow: 2,
        name: "First",
        sku: "DUP-1",
        width: 40,
        height: 80,
      },
    ]);
    expect(result.errors).toEqual([
      {
        row: 3,
        message: 'Duplicate SKU code "DUP-1" (first seen on row 2)',
      },
    ]);
  });

  it("requires header columns", () => {
    const result = parseSkuImportCsv("name,sku\nA,B");
    expect(result.valid).toEqual([]);
    expect(result.errors[0]?.message).toMatch(/missing required column/i);
  });
});

describe("parseSkuImportJson", () => {
  it("parses a happy-path JSON array", () => {
    const result = parseSkuImportJson(
      JSON.stringify([
        {
          name: "Cola 330",
          sku: "COLA-330",
          width: 66,
          height: 115,
          color: "3b82f6",
        },
        { name: "Water", sku: "WTR-01", width: 65, height: 210 },
      ]),
    );

    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual([
      {
        sourceRow: 1,
        name: "Cola 330",
        sku: "COLA-330",
        width: 66,
        height: 115,
        color: "#3b82f6",
      },
      {
        sourceRow: 2,
        name: "Water",
        sku: "WTR-01",
        width: 65,
        height: 210,
      },
    ]);
  });

  it("rejects non-array JSON and bad dims", () => {
    expect(parseSkuImportJson('{"name":"x"}').errors[0]?.message).toMatch(
      /array/i,
    );

    const result = parseSkuImportJson(
      JSON.stringify([{ name: "A", sku: "A-1", width: -1, height: 10 }]),
    );
    expect(result.valid).toEqual([]);
    expect(result.errors).toEqual([
      {
        row: 1,
        message: "Width and height must be positive integers (mm)",
      },
    ]);
  });

  it("rejects duplicate codes case-insensitively", () => {
    const result = parseSkuImportJson(
      JSON.stringify([
        { name: "A", sku: "Dup", width: 10, height: 10 },
        { name: "B", sku: "dup", width: 20, height: 20 },
      ]),
    );
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toEqual([
      {
        row: 2,
        message: 'Duplicate SKU code "dup" (first seen on row 1)',
      },
    ]);
  });
});

describe("parseSkuImport / detectSkuImportFormat", () => {
  it("detects format from filename", () => {
    expect(detectSkuImportFormat("skus.csv")).toBe("csv");
    expect(detectSkuImportFormat("skus.JSON")).toBe("json");
    expect(detectSkuImportFormat("skus.xlsx")).toBeNull();
  });

  it("routes by format", () => {
    const csv = parseSkuImport("name,sku,width,height\nA,A-1,1,2", "csv");
    expect(csv.valid).toHaveLength(1);
    const json = parseSkuImport(
      JSON.stringify([{ name: "A", sku: "A-1", width: 1, height: 2 }]),
      "json",
    );
    expect(json.valid).toHaveLength(1);
  });
});
