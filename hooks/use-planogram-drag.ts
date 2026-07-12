"use client";

import {
  pointerPxToMm,
  projectDrop,
  projectHorizontalDrag,
  CANVAS_LABEL_PADDING_PX,
} from "@/lib/planogram-engine";
import type { DropProjection, PlanogramState } from "@/lib/planogram-engine";
import { useCallback, useEffect, useRef, useState } from "react";

export type DragSku = {
  id: string;
  name: string;
  width: number;
  height: number;
};

export type PlanogramDragState = {
  mode: "palette" | "item";
  itemId?: string;
  sku: DragSku;
  clientX: number;
  clientY: number;
  pointerPx: { x: number; y: number };
  projection: DropProjection;
};

type PaletteCommit = {
  kind: "palette";
  shelfId: string;
  x: number;
  stackIndex: number;
  sku: DragSku;
};

type ItemMoveCommit = {
  kind: "item";
  itemId: string;
  shelfId: string;
  x: number;
  stackIndex: number;
};

export type DragCommit = PaletteCommit | ItemMoveCommit;

export function usePlanogramDrag({
  clientToCanvasLocal,
  state,
  viewportScale,
  onCommit,
}: {
  clientToCanvasLocal: (clientX: number, clientY: number) => {
    x: number;
    y: number;
  } | null;
  state: PlanogramState;
  viewportScale: number;
  onCommit: (result: DragCommit) => void;
}) {
  const [drag, setDrag] = useState<PlanogramDragState | null>(null);
  const stateRef = useRef(state);
  const onCommitRef = useRef(onCommit);
  const clientToCanvasLocalRef = useRef(clientToCanvasLocal);
  const viewportScaleRef = useRef(viewportScale);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    clientToCanvasLocalRef.current = clientToCanvasLocal;
  }, [clientToCanvasLocal]);

  useEffect(() => {
    viewportScaleRef.current = viewportScale;
  }, [viewportScale]);

  const projectAt = useCallback(
    (
      clientX: number,
      clientY: number,
      sku: DragSku,
      mode: "palette" | "item",
      itemId: string | undefined,
      stackOnDrop: boolean,
    ): PlanogramDragState | null => {
      const pointerPx = clientToCanvasLocalRef.current?.(clientX, clientY);
      if (!pointerPx) return null;

      const pointerMm = pointerPxToMm({
        x: Math.max(0, pointerPx.x - CANVAS_LABEL_PADDING_PX),
        y: pointerPx.y,
      });

      const scale = viewportScaleRef.current;
      // Shift+drop places on shelf-wide tier 1; otherwise palette uses base row.
      // Item moves without Shift keep the item's current stack via horizontal drag.
      const projection =
        mode === "item" && itemId && !stackOnDrop
          ? projectHorizontalDrag(stateRef.current, itemId, pointerMm, scale)
          : projectDrop(stateRef.current, {
              pointerMm,
              sku: { width: sku.width, height: sku.height },
              viewportScale: scale,
              stackIndex: stackOnDrop ? 1 : 0,
              excludeItemId: mode === "item" ? itemId : undefined,
            });

      return {
        mode,
        itemId,
        sku,
        clientX,
        clientY,
        pointerPx,
        projection,
      };
    },
    [],
  );

  const bindDrag = useCallback(
    (
      sku: DragSku,
      event: React.PointerEvent,
      mode: "palette" | "item",
      itemId?: string,
    ) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();
      document.body.style.cursor = "none";

      const onPointerMove = (moveEvent: PointerEvent) => {
        const next = projectAt(
          moveEvent.clientX,
          moveEvent.clientY,
          sku,
          mode,
          itemId,
          moveEvent.shiftKey,
        );
        if (next) setDrag(next);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        document.body.style.cursor = "";

        const next = projectAt(
          upEvent.clientX,
          upEvent.clientY,
          sku,
          mode,
          itemId,
          upEvent.shiftKey,
        );

        if (next?.projection.ok) {
          if (mode === "item" && itemId) {
            onCommitRef.current({
              kind: "item",
              itemId,
              shelfId: next.projection.shelfId,
              x: next.projection.x,
              stackIndex: next.projection.stackIndex,
            });
          } else {
            onCommitRef.current({
              kind: "palette",
              shelfId: next.projection.shelfId,
              x: next.projection.x,
              stackIndex: next.projection.stackIndex,
              sku,
            });
          }
        }
        setDrag(null);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);

      const next = projectAt(
        event.clientX,
        event.clientY,
        sku,
        mode,
        itemId,
        event.shiftKey,
      );
      if (next) setDrag(next);
    },
    [projectAt],
  );

  const startDrag = useCallback(
    (sku: DragSku, event: React.PointerEvent) => {
      bindDrag(sku, event, "palette");
    },
    [bindDrag],
  );

  const startItemDrag = useCallback(
    (
      item: {
        id: string;
        skuId: string;
        width: number;
        height: number;
        name: string;
      },
      event: React.PointerEvent,
    ) => {
      bindDrag(
        {
          id: item.skuId,
          name: item.name,
          width: item.width,
          height: item.height,
        },
        event,
        "item",
        item.id,
      );
    },
    [bindDrag],
  );

  const cancelDrag = useCallback(() => {
    setDrag(null);
    document.body.style.cursor = "";
  }, []);

  return { drag, startDrag, startItemDrag, cancelDrag };
}
