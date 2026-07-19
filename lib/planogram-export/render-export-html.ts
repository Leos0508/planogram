import type { PlanogramLayout, PlanogramState } from "@/lib/planogram-engine/types";
import { itemFacingsWide } from "@/lib/planogram-engine/facings";
import { planogramPdfExportFilename } from "@/lib/planogram-export/filename";
import { printHtmlDocument } from "@/lib/planogram-export/print-html";
import {
  type ExportSku,
  renderPlanogramSvg,
} from "@/lib/planogram-export/render-svg";

export type ExportSkuDetail = ExportSku & {
  id: string;
  sku: string;
  width: number;
  height: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function collectUsedSkuIds(state: PlanogramState): Set<string> {
  const ids = new Set<string>();
  for (const shelf of state.shelves) {
    for (const item of shelf.items) {
      ids.add(item.skuId);
    }
  }
  return ids;
}

function facingSummary(state: PlanogramState, skuId: string): number {
  let total = 0;
  for (const shelf of state.shelves) {
    for (const item of shelf.items) {
      if (item.skuId === skuId) {
        total += itemFacingsWide(item);
      }
    }
  }
  return total;
}

/** Build a print-friendly HTML report (visual + shelf specs + SKU list). */
export function renderPlanogramExportHtml({
  layout,
  state,
  skuById,
  planogramName,
}: {
  layout: PlanogramLayout;
  state: PlanogramState;
  skuById: Map<string, ExportSkuDetail>;
  planogramName: string;
}): string {
  const svg = renderPlanogramSvg({
    layout,
    state,
    skuById,
    planogramName,
  });

  const shelfRows = layout.shelves
    .map((shelf) => {
      const source = state.shelves.find((row) => row.id === shelf.shelfId);
      const minWidth = source?.minContentWidthMm ?? layout.contentWidthMm;
      const minHeight = source?.minContentHeightMm ?? shelf.contentHeightMm;
      return `<tr>
        <td>Shelf ${shelf.index + 1}</td>
        <td>${layout.contentWidthMm}</td>
        <td>${minWidth}</td>
        <td>${shelf.contentHeightMm}</td>
        <td>${minHeight}</td>
        <td>${shelf.rowHeightMm}</td>
      </tr>`;
    })
    .join("");

  const usedIds = collectUsedSkuIds(state);
  const skuRows = [...usedIds]
    .map((id) => skuById.get(id))
    .filter((sku): sku is ExportSkuDetail => Boolean(sku))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((sku) => {
      const image = sku.imageUrl
        ? `<img src="${escapeHtml(sku.imageUrl)}" alt="" width="40" height="40" />`
        : `<span class="placeholder">—</span>`;
      return `<tr>
        <td class="thumb">${image}</td>
        <td>${escapeHtml(sku.name)}</td>
        <td>${escapeHtml(sku.sku)}</td>
        <td>${sku.width} × ${sku.height}</td>
        <td>${facingSummary(state, sku.id)}</td>
      </tr>`;
    })
    .join("");

  const emptySkuRow =
    skuRows.length === 0
      ? `<tr><td colspan="5" class="muted">No SKUs placed on this planogram.</td></tr>`
      : "";

  // Browsers use <title> as the Save-as-PDF suggested filename (PLA-72).
  const pdfFilename = planogramPdfExportFilename(planogramName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pdfFilename)}</title>
  <style>
    @page { margin: 12mm; size: A4; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #18181b;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      font-size: 12px;
      line-height: 1.4;
    }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 20px 0 8px; page-break-after: avoid; }
    .meta { color: #71717a; margin-bottom: 16px; }
    .visual {
      page-break-inside: avoid;
      border: 1px solid #e4e4e7;
      padding: 8px;
      overflow: auto;
    }
    .visual svg { display: block; max-width: 100%; height: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    th, td {
      border: 1px solid #e4e4e7;
      padding: 6px 8px;
      text-align: left;
      vertical-align: middle;
    }
    th { background: #f4f4f5; font-weight: 600; }
    td.thumb { width: 48px; text-align: center; }
    td.thumb img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .placeholder { color: #a1a1aa; }
    .muted { color: #71717a; }
    .hint {
      margin-top: 24px;
      color: #71717a;
      font-size: 11px;
    }
    @media print {
      .hint { display: none; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(planogramName)}</h1>
  <p class="meta">
    Fixture width ${layout.contentWidthMm} mm ·
    Top clearance ${state.config.topClearance} mm ·
    Stack gap ${state.config.stackGap} mm
  </p>

  <h2>Visual</h2>
  <div class="visual">${svg.replace(/^<\?xml[^>]*>\s*/u, "")}</div>

  <h2>Shelf specs (mm)</h2>
  <table>
    <thead>
      <tr>
        <th>Shelf</th>
        <th>Fixture width</th>
        <th>Min width</th>
        <th>Content height</th>
        <th>Min content height</th>
        <th>Row height</th>
      </tr>
    </thead>
    <tbody>
      ${shelfRows}
    </tbody>
  </table>

  <h2>SKU list</h2>
  <table>
    <thead>
      <tr>
        <th>Image</th>
        <th>Name</th>
        <th>Code</th>
        <th>Size (W × H mm)</th>
        <th>Facings</th>
      </tr>
    </thead>
    <tbody>
      ${skuRows}${emptySkuRow}
    </tbody>
  </table>

  <p class="hint">Use your browser’s print dialog and choose “Save as PDF”.</p>
</body>
</html>`;
}

/** Open the system print dialog for Save-as-PDF. */
export function printPlanogramExportHtml(html: string): boolean {
  return printHtmlDocument(html);
}
