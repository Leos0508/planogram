"use client";

import { mmToPx, CANVAS_LABEL_PADDING_PX, itemFacingsWide } from "@/lib/planogram-engine";
import type { PlanogramDragState } from "@/hooks/use-planogram-drag";
import type { ShelfResizeState } from "@/hooks/use-shelf-resize";
import type { ShelfWidthResizeState } from "@/hooks/use-shelf-width-resize";
import type { PlanogramLayout, PlanogramState } from "@/lib/planogram-engine";
import { shelfDisplayLabel } from "@/lib/planograms/shelf-label";
import type { Sku } from "@/lib/skus/queries";
import { useMemo } from "react";

function toCanvasPxY(mm: number, originMm: number) {
  return mmToPx(mm - originMm);
}

function toCanvasPxX(mm: number) {
  return mmToPx(mm);
}

export default function PlanogramCanvas({
  canvasRef,
  layout,
  state,
  skuById,
  drag,
  shelfResize,
  shelfWidthResize,
  selectedItemId,
  activeShelfId,
  onItemPointerDown,
  onShelfResizePointerDown,
  onShelfWidthResizePointerDown,
  onCanvasPointerDown,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  layout: PlanogramLayout;
  state: PlanogramState;
  skuById: Map<string, Sku>;
  drag: PlanogramDragState | null;
  shelfResize: ShelfResizeState | null;
  shelfWidthResize: ShelfWidthResizeState | null;
  selectedItemId: string | null;
  activeShelfId?: string | null;
  onItemPointerDown: (
    item: {
      id: string;
      skuId: string;
      x: number;
      width: number;
      height: number;
    },
    event: React.PointerEvent,
  ) => void;
  onShelfResizePointerDown: (
    shelfId: string,
    event: React.PointerEvent,
  ) => void;
  onShelfWidthResizePointerDown: (
    shelfId: string,
    event: React.PointerEvent,
  ) => void;
  onCanvasPointerDown: () => void;
}) {
  const originY = layout.bounds.y;
  const shelfWidthPx = mmToPx(layout.contentWidthMm);
  const heightPx = mmToPx(layout.bounds.height);

  const ghost = drag?.projection.previewRect;
  const ghostValid = drag?.projection.ok ?? false;
  const showCanvasGhost = Boolean(ghost);
  const draggingItemId = drag?.mode === "item" ? drag.itemId : null;
  const guides = drag?.projection.guides ?? [];
  const guideShelf =
    drag?.projection.shelfId != null
      ? layout.shelves.find((s) => s.shelfId === drag.projection.shelfId)
      : undefined;

  const facingsByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const shelf of state.shelves) {
      for (const item of shelf.items) {
        map.set(item.id, itemFacingsWide(item));
      }
    }
    return map;
  }, [state.shelves]);

  return (
    <div
      ref={canvasRef}
      className="canvas-checkered relative inline-block overflow-visible border"
      style={{
        width: shelfWidthPx + CANVAS_LABEL_PADDING_PX,
        height: heightPx,
      }}
    >
      {layout.shelves.map((shelf) => (
        <span
          key={`label-${shelf.shelfId}`}
          className="pointer-events-none absolute z-20 -translate-y-1/2 font-mono text-xs text-muted-foreground"
          style={{
            left: 0,
            width: CANVAS_LABEL_PADDING_PX,
            textAlign: "right",
            paddingRight: 12,
            top: toCanvasPxY(shelf.yMm, originY),
          }}
        >
          {shelfDisplayLabel(shelf.index)}
        </span>
      ))}

      <svg
        width={shelfWidthPx}
        height={heightPx}
        className="block overflow-visible"
        style={{ marginLeft: CANVAS_LABEL_PADDING_PX, overflow: "visible" }}
        role="img"
        aria-label="Planogram canvas"
        onPointerDown={onCanvasPointerDown}
      >
        {layout.shelves.map((shelf) => {
          const clearancePx = mmToPx(state.config.topClearance);
          const rowTopPx = toCanvasPxY(shelf.rowTopMm, originY);
          const contentTopPx = rowTopPx + clearancePx;
          const contentHeightPx = mmToPx(shelf.contentHeightMm);
          const isActive = activeShelfId === shelf.shelfId;
          const isResizingHeight = shelfResize?.shelfId === shelf.shelfId;
          const isResizingWidth = shelfWidthResize?.shelfId === shelf.shelfId;
          const shelfLineY = toCanvasPxY(shelf.yMm, originY);

          return (
            <g key={shelf.shelfId}>
              <rect
                x={0}
                y={rowTopPx}
                width={shelfWidthPx}
                height={clearancePx}
                className="fill-muted/50"
              />
              <rect
                x={0}
                y={contentTopPx}
                width={shelfWidthPx}
                height={contentHeightPx}
                className={isActive ? "fill-[var(--canvas-shelf-active)]" : "fill-muted/20"}
                stroke={isActive ? "var(--canvas-valid)" : undefined}
                strokeWidth={isActive ? 2 : 0}
              />
              {/* Clearance / content divider (not the resize handle). */}
              <line
                x1={0}
                y1={contentTopPx}
                x2={shelfWidthPx}
                y2={contentTopPx}
                className="stroke-border/60"
                strokeWidth={1}
              />
              {/* Height resize handle on shelf row top (outer top). */}
              <rect
                x={0}
                y={rowTopPx - 4}
                width={shelfWidthPx}
                height={8}
                className="cursor-ns-resize fill-transparent"
                onPointerDown={(event) =>
                  onShelfResizePointerDown(shelf.shelfId, event)
                }
              />
              <line
                x1={0}
                y1={rowTopPx}
                x2={shelfWidthPx}
                y2={rowTopPx}
                className={
                  isResizingHeight
                    ? "stroke-[var(--canvas-valid)]"
                    : "stroke-border/40"
                }
                strokeWidth={isResizingHeight ? 2 : 1}
              />
              <line
                x1={0}
                y1={shelfLineY}
                x2={shelfWidthPx}
                y2={shelfLineY}
                className="stroke-border"
                strokeWidth={2}
              />
              {/* Width resize handle on shelf right edge (v1 primary). */}
              <rect
                x={shelfWidthPx - 4}
                y={rowTopPx}
                width={8}
                height={shelfLineY - rowTopPx}
                className="cursor-ew-resize fill-transparent"
                onPointerDown={(event) =>
                  onShelfWidthResizePointerDown(shelf.shelfId, event)
                }
              />
              <line
                x1={shelfWidthPx}
                y1={rowTopPx}
                x2={shelfWidthPx}
                y2={shelfLineY}
                className={
                  isResizingWidth
                    ? "stroke-[var(--canvas-valid)]"
                    : "stroke-border/40"
                }
                strokeWidth={isResizingWidth ? 2 : 1}
              />
            </g>
          );
        })}

        {layout.items.map((item) => {
          if (draggingItemId === item.itemId) {
            return null;
          }

          const selected = selectedItemId === item.itemId;
          const highlighted =
            selected || draggingItemId === item.itemId;
          const facingsWide = facingsByItemId.get(item.itemId) ?? 1;
          const unitWidthPx = mmToPx(item.rect.width / facingsWide);
          const sku = skuById.get(item.skuId);
          const xPx = toCanvasPxX(item.rect.x);
          const yPx = toCanvasPxY(item.rect.y, originY);
          const widthPx = mmToPx(item.rect.width);
          const heightPx = mmToPx(item.rect.height);
          const strokeClass = highlighted
            ? "stroke-primary"
            : "stroke-muted-foreground";

          return (
            <g key={item.itemId}>
              <defs>
                <clipPath id={`clip-${item.itemId}`}>
                  <rect x={xPx} y={yPx} width={widthPx} height={heightPx} rx={2} />
                </clipPath>
              </defs>
              <rect
                x={xPx}
                y={yPx}
                width={widthPx}
                height={heightPx}
                fill={
                  sku && !sku.imageUrl ? sku.color : undefined
                }
                fillOpacity={
                  sku && !sku.imageUrl ? (selected ? 0.55 : 0.4) : undefined
                }
                className={
                  sku && !sku.imageUrl
                    ? `cursor-grab ${strokeClass}`
                    : highlighted
                      ? `cursor-grab fill-primary/35 ${strokeClass}`
                      : `cursor-grab fill-primary/20 ${strokeClass}`
                }
                strokeWidth={highlighted ? 2 : 1}
                rx={2}
                onPointerDown={(event) =>
                  onItemPointerDown(
                    {
                      id: item.itemId,
                      skuId: item.skuId,
                      x: item.rect.x,
                      width: item.rect.width / facingsWide,
                      height: item.rect.height,
                    },
                    event,
                  )
                }
              />
              {sku?.imageUrl ? (
                <image
                  href={sku.imageUrl}
                  x={xPx + 2}
                  y={yPx + 2}
                  width={Math.max(0, widthPx - 4)}
                  height={Math.max(0, heightPx - 4)}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#clip-${item.itemId})`}
                  className="pointer-events-none"
                />
              ) : null}
              {facingsWide > 1
                ? Array.from({ length: facingsWide - 1 }, (_, index) => (
                    <line
                      key={`${item.itemId}-facing-${index}`}
                      x1={xPx + unitWidthPx * (index + 1)}
                      y1={yPx}
                      x2={xPx + unitWidthPx * (index + 1)}
                      y2={yPx + heightPx}
                      className={
                        highlighted
                          ? "stroke-primary/40"
                          : "stroke-muted-foreground/40"
                      }
                      strokeWidth={1}
                    />
                  ))
                : null}
              {facingsWide > 1 ? (
                <text
                  x={xPx + widthPx / 2}
                  y={yPx + heightPx / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none fill-foreground/80 font-mono"
                  style={{ fontSize: mmToPx(12) }}
                >
                  ×{facingsWide}
                </text>
              ) : null}
            </g>
          );
        })}

        {showCanvasGhost && ghost && (
          <g>
            <rect
              x={toCanvasPxX(ghost.x)}
              y={toCanvasPxY(ghost.y, originY)}
              width={mmToPx(ghost.width)}
              height={mmToPx(ghost.height)}
              className={
                ghostValid
                  ? "fill-primary/30 stroke-[var(--canvas-valid)]"
                  : "fill-destructive/15 stroke-destructive"
              }
              strokeWidth={2}
              strokeDasharray={ghostValid ? undefined : "4 4"}
              rx={2}
            />
            <text
              x={toCanvasPxX(ghost.x) + mmToPx(ghost.width) / 2}
              y={toCanvasPxY(ghost.y, originY) + mmToPx(ghost.height) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[8px]"
              style={{ fontSize: mmToPx(10) }}
            >
              {drag?.sku.name}
            </text>
          </g>
        )}

        {guides.length > 0 && guideShelf ? (
          <g aria-hidden className="pointer-events-none">
            {guides.map((guide, index) => {
              if (guide.orientation === "vertical") {
                const xPx = toCanvasPxX(guide.positionMm);
                const y1 = toCanvasPxY(guideShelf.rowTopMm, originY);
                const y2 = toCanvasPxY(guideShelf.yMm, originY);
                return (
                  <line
                    key={`guide-v-${index}`}
                    x1={xPx}
                    y1={y1}
                    x2={xPx}
                    y2={y2}
                    className="stroke-[var(--canvas-guide)]"
                    strokeWidth={1}
                  />
                );
              }

              const yPx = toCanvasPxY(guide.positionMm, originY);
              return (
                <line
                  key={`guide-h-${index}`}
                  x1={0}
                  y1={yPx}
                  x2={shelfWidthPx}
                  y2={yPx}
                  className="stroke-[var(--canvas-guide)]"
                  strokeWidth={1}
                />
              );
            })}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
