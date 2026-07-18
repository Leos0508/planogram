"use client";

import EditorCommandsPanel from "@/components/editor-commands-panel";
import { Button } from "@/components/ui/button";
import type { ViewportTransform } from "@/hooks/use-canvas-viewport";
import {
  FileTextIcon,
  Maximize2Icon,
  DownloadIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";

export default function PlanogramViewport({
  viewportRef,
  transform,
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
  onFitToView: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onExportSvg?: () => void;
  onExportPdf?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewportRef}
        className="h-full w-full touch-none overflow-hidden bg-background"
      >
        <div
          className="inline-block origin-top-left will-change-transform"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {children}
        </div>
      </div>

      <EditorCommandsPanel />

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
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="pointer-events-auto shadow-sm"
          onClick={onFitToView}
          title="Fit to view"
        >
          <Maximize2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
