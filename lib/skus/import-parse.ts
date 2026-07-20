import {
  isValidSkuFootprint,
  normalizeSkuColor,
  parsePositiveInt,
} from "@/lib/validation/sku";

export type SkuImportFormat = "csv" | "json";

export type SkuImportRow = {
  /** 1-based data row (CSV skips header; JSON is array index + 1). */
  sourceRow: number;
  name: string;
  sku: string;
  width: number;
  height: number;
  /** Present only when the source provided a valid color. */
  color?: string;
  imageUrl?: string | null;
};

export type SkuImportRowError = {
  /** 1-based data row (CSV skips header; JSON is array index + 1). */
  row: number;
  message: string;
};

export type SkuImportParseResult = {
  valid: SkuImportRow[];
  errors: SkuImportRowError[];
};

const REQUIRED_FIELDS = ["name", "sku", "width", "height"] as const;

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

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Split a single CSV line into fields (supports double-quoted values). */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      fields.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  fields.push(current);
  return fields;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES: Record<string, keyof SkuImportRow | "imageurl"> = {
  name: "name",
  sku: "sku",
  code: "sku",
  skucode: "sku",
  width: "width",
  height: "height",
  color: "color",
  imageurl: "imageurl",
  image: "imageurl",
};

function mapHeader(raw: string): keyof SkuImportRow | "imageurl" | null {
  const key = normalizeHeader(raw);
  return HEADER_ALIASES[key] ?? null;
}

type RawRecord = Record<string, unknown>;

function validateRawRecord(
  raw: RawRecord,
  row: number,
): { ok: true; data: SkuImportRow } | { ok: false; error: SkuImportRowError } {
  const name = String(raw.name ?? "").trim();
  const sku = String(raw.sku ?? "").trim();

  if (!name) {
    return { ok: false, error: { row, message: "Name is required" } };
  }
  if (!sku) {
    return { ok: false, error: { row, message: "SKU code is required" } };
  }

  const widthRaw = raw.width;
  const heightRaw = raw.height;
  const width =
    typeof widthRaw === "number"
      ? Number.isFinite(widthRaw)
        ? Math.trunc(widthRaw)
        : null
      : parsePositiveInt(String(widthRaw ?? "").trim());
  const height =
    typeof heightRaw === "number"
      ? Number.isFinite(heightRaw)
        ? Math.trunc(heightRaw)
        : null
      : parsePositiveInt(String(heightRaw ?? "").trim());

  if (width === null || height === null || !isValidSkuFootprint(width, height)) {
    return {
      ok: false,
      error: {
        row,
        message: "Width and height must be positive integers (mm)",
      },
    };
  }

  const colorRaw = raw.color;
  const colorProvided =
    colorRaw !== undefined &&
    colorRaw !== null &&
    String(colorRaw).trim() !== "";

  let color: string | undefined;
  if (colorProvided) {
    const normalized = normalizeSkuColor(String(colorRaw));
    if (!normalized) {
      return {
        ok: false,
        error: { row, message: "Color must be a valid hex value (#rrggbb)" },
      };
    }
    color = normalized;
  }

  const imageRaw = raw.imageUrl ?? raw.imageurl;
  const imageProvided =
    imageRaw !== undefined &&
    imageRaw !== null &&
    String(imageRaw).trim() !== "";

  let imageUrl: string | null | undefined;
  if (imageProvided) {
    const normalized = normalizeImageUrl(String(imageRaw));
    if (!normalized) {
      return {
        ok: false,
        error: { row, message: "Image URL must be a valid http(s) URL" },
      };
    }
    imageUrl = normalized;
  }

  return {
    ok: true,
    data: {
      sourceRow: row,
      name,
      sku,
      width,
      height,
      ...(color ? { color } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    },
  };
}

function rejectDuplicateCodes(
  valid: SkuImportRow[],
  errors: SkuImportRowError[],
): SkuImportRow[] {
  const seen = new Map<string, number>();
  const kept: SkuImportRow[] = [];

  for (const item of valid) {
    const key = item.sku.toLowerCase();
    const firstRow = seen.get(key);
    if (firstRow !== undefined) {
      errors.push({
        row: item.sourceRow,
        message: `Duplicate SKU code "${item.sku}" (first seen on row ${firstRow})`,
      });
      continue;
    }
    seen.set(key, item.sourceRow);
    kept.push(item);
  }

  return kept;
}

export function parseSkuImportCsv(content: string): SkuImportParseResult {
  const text = stripBom(content).trim();
  if (!text) {
    return { valid: [], errors: [{ row: 1, message: "CSV file is empty" }] };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      valid: [],
      errors: [{ row: 1, message: "CSV must include a header row and at least one data row" }],
    };
  }

  const headers = splitCsvLine(lines[0]!).map(mapHeader);
  const missingRequired = REQUIRED_FIELDS.filter(
    (field) => !headers.includes(field),
  );
  if (missingRequired.length > 0) {
    return {
      valid: [],
      errors: [
        {
          row: 1,
          message: `CSV header missing required column(s): ${missingRequired.join(", ")}`,
        },
      ],
    };
  }

  const valid: SkuImportRow[] = [];
  const errors: SkuImportRowError[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const cells = splitCsvLine(lines[i]!);
    const raw: RawRecord = {};

    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c];
      if (!key) continue;
      const value = cells[c] ?? "";
      if (key === "imageurl") {
        raw.imageUrl = value;
      } else {
        raw[key] = value;
      }
    }

    const result = validateRawRecord(raw, rowNumber);
    if (!result.ok) {
      errors.push(result.error);
      continue;
    }
    valid.push(result.data);
  }

  return {
    valid: rejectDuplicateCodes(valid, errors),
    errors,
  };
}

export function parseSkuImportJson(content: string): SkuImportParseResult {
  const text = stripBom(content).trim();
  if (!text) {
    return { valid: [], errors: [{ row: 1, message: "JSON file is empty" }] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: [], errors: [{ row: 1, message: "Invalid JSON" }] };
  }

  if (!Array.isArray(parsed)) {
    return {
      valid: [],
      errors: [{ row: 1, message: "JSON must be an array of SKU objects" }],
    };
  }

  if (parsed.length === 0) {
    return {
      valid: [],
      errors: [{ row: 1, message: "JSON array is empty" }],
    };
  }

  const valid: SkuImportRow[] = [];
  const errors: SkuImportRowError[] = [];

  for (let i = 0; i < parsed.length; i += 1) {
    const rowNumber = i + 1;
    const item = parsed[i];
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      errors.push({ row: rowNumber, message: "Row must be an object" });
      continue;
    }

    const result = validateRawRecord(item as RawRecord, rowNumber);
    if (!result.ok) {
      errors.push(result.error);
      continue;
    }
    valid.push(result.data);
  }

  return {
    valid: rejectDuplicateCodes(valid, errors),
    errors,
  };
}

export function detectSkuImportFormat(
  filename: string,
  mimeType?: string,
): SkuImportFormat | null {
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";

  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.includes("csv") || mime === "text/plain") return "csv";
  if (mime.includes("json")) return "json";
  return null;
}

export function parseSkuImport(
  content: string,
  format: SkuImportFormat,
): SkuImportParseResult {
  return format === "csv" ? parseSkuImportCsv(content) : parseSkuImportJson(content);
}
