import {
  CANVAS_LABEL_PADDING_PX,
  mmToPx,
  PX_PER_MM,
} from "@/lib/planogram-engine/constant";
import { itemFacingsWide } from "@/lib/planogram-engine/facings";
import type { PlanogramLayout, PlanogramState } from "@/lib/planogram-engine/types";
import { printHtmlDocument } from "@/lib/planogram-export/print-html";

export type ExportSku = {
  name: string;
  imageUrl?: string | null;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Standalone SVG for download or print (scaffold for future PDF pipeline). */
export function renderPlanogramSvg({
  layout,
  state,
  skuById,
  planogramName,
}: {
  layout: PlanogramLayout;
  state: PlanogramState;
  skuById: Map<string, ExportSku>;
  planogramName: string;
}): string {
  const originY = layout.bounds.y;
  const shelfWidthPx = mmToPx(layout.contentWidthMm);
  const heightPx = mmToPx(layout.bounds.height);
  const widthPx = shelfWidthPx + CANVAS_LABEL_PADDING_PX;

  const toCanvasPxY = (mm: number) => mmToPx(mm - originY);
  const toCanvasPxX = (mm: number) => mmToPx(mm);

  const facingsByItemId = new Map<string, number>();
  for (const shelf of state.shelves) {
    for (const item of shelf.items) {
      facingsByItemId.set(item.id, itemFacingsWide(item));
    }
  }

  const shelfMarkup = layout.shelves
    .map((shelf) => {
      const clearancePx = mmToPx(state.config.topClearance);
      const rowTopPx = toCanvasPxY(shelf.rowTopMm);
      const contentTopPx = rowTopPx + clearancePx;
      const contentHeightPx = mmToPx(shelf.contentHeightMm);
      const lineY = toCanvasPxY(shelf.yMm);

      return `
        <rect x="${CANVAS_LABEL_PADDING_PX}" y="${rowTopPx}" width="${shelfWidthPx}" height="${clearancePx}" fill="#f4f4f5" />
        <rect x="${CANVAS_LABEL_PADDING_PX}" y="${contentTopPx}" width="${shelfWidthPx}" height="${contentHeightPx}" fill="#fafafa" stroke="#e4e4e7" />
        <line x1="${CANVAS_LABEL_PADDING_PX}" y1="${lineY}" x2="${CANVAS_LABEL_PADDING_PX + shelfWidthPx}" y2="${lineY}" stroke="#71717a" stroke-width="2" />
        <text x="${CANVAS_LABEL_PADDING_PX - 12}" y="${lineY}" text-anchor="end" dominant-baseline="middle" font-family="ui-monospace, monospace" font-size="12" fill="#71717a">Shelf ${shelf.index + 1}</text>
      `;
    })
    .join("");

  const itemMarkup = layout.items
    .map((item) => {
      const x = CANVAS_LABEL_PADDING_PX + toCanvasPxX(item.rect.x);
      const y = toCanvasPxY(item.rect.y);
      const width = mmToPx(item.rect.width);
      const height = mmToPx(item.rect.height);
      const sku = skuById.get(item.skuId);
      const facingsWide = facingsByItemId.get(item.itemId) ?? 1;
      const unitWidthPx = width / facingsWide;
      const label = escapeXml(sku?.name ?? "Item");

      const dividers =
        facingsWide > 1
          ? Array.from({ length: facingsWide - 1 }, (_, index) => {
              const dividerX = x + unitWidthPx * (index + 1);
              return `<line x1="${dividerX}" y1="${y}" x2="${dividerX}" y2="${y + height}" stroke="#a1a1aa" stroke-width="1" />`;
            }).join("")
          : "";

      const image =
        sku?.imageUrl
          ? `<image href="${escapeXml(sku.imageUrl)}" x="${x + 2}" y="${y + 2}" width="${width - 4}" height="${height - 4}" preserveAspectRatio="xMidYMid meet" clip-path="url(#clip-${item.itemId})" />`
          : "";

      return `
        <defs>
          <clipPath id="clip-${item.itemId}">
            <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" />
          </clipPath>
        </defs>
        <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#dbeafe" stroke="#2563eb" stroke-width="1" rx="2" />
        ${image}
        ${dividers}
        <text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${Math.max(8, mmToPx(10))}" fill="#18181b">${label}</text>
      `;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  <title>${escapeXml(planogramName)}</title>
  <desc>Planogram export at ${PX_PER_MM} px/mm</desc>
  <rect width="100%" height="100%" fill="#ffffff" />
  ${shelfMarkup}
  ${itemMarkup}
</svg>`;
}

export function downloadPlanogramSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function printPlanogramSvg(svg: string, title: string) {
  const markup = svg.replace(/^<\?xml[^>]*>\s*/u, "");
  return printHtmlDocument(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeXml(title)}</title>
    <style>
      @page { margin: 12mm; }
      body { margin: 0; display: flex; justify-content: center; }
      svg { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>${markup}</body>
</html>`);
}
