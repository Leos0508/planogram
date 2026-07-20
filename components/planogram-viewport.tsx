"use client";

import EditorCommandsPanel from "@/components/editor-commands-panel";
import { Button } from "@/components/ui/button";
import type { ViewportTransform } from "@/hooks/use-canvas-viewport";
import {
  BoxIcon,
  FileTextIcon,
  Maximize2Icon,
  DownloadIcon,
  Redo2Icon,
  SquareIcon,
  Undo2Icon,
} from "lucide-react";

export type PlanogramViewMode = "2d" | "3d";

export default function PlanogramViewport({
  viewportRef,
  transform,
  viewMode = "2d",
  onViewModeChange,
  onFitToView,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onExportSvg,
  onExportPdf,
  children,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  transform: ViewportTransform;
  viewMode?: PlanogramViewMode;
  onViewModeChange?: (mode: PlanogramViewMode) => void;
  onFitToView: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onExportSvg?: () => void;
  onExportPdf?: () => void;
  children: React.ReactNode;
}) {
  const is3d = viewMode === "3d";

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewportRef}
        className="h-full w-full touch-none overflow-hidden bg-background"
      >
        {is3d ? (
          <div className="h-full w-full">{children}</div>
        ) : (
          <div
            className="inline-block origin-top-left will-change-transform"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            }}
          >
            {children}
          </div>
        )}
      </div>

      {is3d ? null : <EditorCommandsPanel />}

      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
        {onUndo ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="pointer-events-auto shadow-sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2Icon className="size-4" />
          </Button>
        ) : null}
        {onRedo ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="pointer-events-auto shadow-sm"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2Icon className="size-4" />
          </Button>
        ) : null}
        {onExportSvg ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="pointer-events-auto shadow-sm"
            onClick={onExportSvg}
            title="Download SVG export"
          >
            <DownloadIcon className="size-4" />
          </Button>
        ) : null}
        {onExportPdf ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="pointer-events-auto shadow-sm"
            onClick={onExportPdf}
            title="Export PDF (print / Save as PDF)"
          >
            <FileTextIcon className="size-4" />
          </Button>
        ) : null}
        {onViewModeChange ? (
          <Button
            type="button"
            variant={is3d ? "default" : "secondary"}
            size="icon-sm"
            className="pointer-events-auto shadow-sm"
            onClick={() => onViewModeChange(is3d ? "2d" : "3d")}
            title={is3d ? "Switch to 2D editor" : "3D preview (read-only)"}
            aria-pressed={is3d}
            aria-label={is3d ? "Switch to 2D editor" : "Open 3D preview"}
          >
            {is3d ? (
              <SquareIcon className="size-4" />
            ) : (
              <BoxIcon className="size-4" />
            )}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="pointer-events-auto shadow-sm"
          onClick={onFitToView}
          title={is3d ? "Fit 3D view" : "Fit to view"}
        >
          <Maximize2Icon className="size-4" />
        </Button>
      </div>

      {is3d ? (
        <p className="pointer-events-none absolute bottom-3 left-3 max-w-xs text-xs text-muted-foreground">
          3D preview · read-only · drag to orbit · scroll to zoom
        </p>
      ) : null}
    </div>
  );
}
