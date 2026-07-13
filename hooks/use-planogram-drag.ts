"use client";

import {
  pointerPxToMm,
  projectDrop,
  projectItemDrag,
  CANVAS_LABEL_PADDING_PX,
} from "@/lib/planogram-engine";
import type { DropProjection, DropReason, PlanogramState } from "@/lib/planogram-engine";
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
  /** Alt held — Y snap disabled (free float within band). */
  forceFloat: boolean;
  projection: DropProjection;
};

type PaletteCommit = {
  kind: "palette";
  shelfId: string;
  x: number;
  y: number;
  sku: DragSku;
};

type ItemMoveCommit = {
  kind: "item";
  itemId: string;
  shelfId: string;
  x: number;
  y: number;
};

export type DragCommit = PaletteCommit | ItemMoveCommit;

export function usePlanogramDrag({
  clientToCanvasLocal,
  state,
  viewportScale,
  onCommit,
  onDropRejected,
}: {
  clientToCanvasLocal: (clientX: number, clientY: number) => {
    x: number;
    y: number;
  } | null;
  state: PlanogramState;
  viewportScale: number;
  onCommit: (result: DragCommit) => void;
  onDropRejected?: (reason: DropReason) => void;
}) {
  const [drag, setDrag] = useState<PlanogramDragState | null>(null);
  const stateRef = useRef(state);
  const onCommitRef = useRef(onCommit);
  const onDropRejectedRef = useRef(onDropRejected);
  const clientToCanvasLocalRef = useRef(clientToCanvasLocal);
  const viewportScaleRef = useRef(viewportScale);
  const endDragSessionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    onDropRejectedRef.current = onDropRejected;
  }, [onDropRejected]);

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
      itemId?: string,
      forceFloat = false,
    ): PlanogramDragState | null => {
      const pointerPx = clientToCanvasLocalRef.current?.(clientX, clientY);
      if (!pointerPx) return null;

      const pointerMm = pointerPxToMm({
        x: Math.max(0, pointerPx.x - CANVAS_LABEL_PADDING_PX),
        y: pointerPx.y,
      });

      const scale = viewportScaleRef.current;
      const projection =
        mode === "item" && itemId
          ? projectItemDrag(
              stateRef.current,
              itemId,
              pointerMm,
              scale,
              forceFloat,
            )
          : projectDrop(stateRef.current, {
              pointerMm,
              sku: { width: sku.width, height: sku.height },
              viewportScale: scale,
              forceFloat,
            });

      return {
        mode,
        itemId,
        sku,
        clientX,
        clientY,
        pointerPx,
        forceFloat,
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

      let lastClientX = event.clientX;
      let lastClientY = event.clientY;

      const projectFromPointer = (
        clientX: number,
        clientY: number,
        forceFloat: boolean,
      ) => {
        const next = projectAt(
          clientX,
          clientY,
          sku,
          mode,
          itemId,
          forceFloat,
        );
        if (next) setDrag(next);
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        lastClientX = moveEvent.clientX;
        lastClientY = moveEvent.clientY;
        projectFromPointer(
          moveEvent.clientX,
          moveEvent.clientY,
          moveEvent.altKey,
        );
      };

      const onAltChange = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key !== "Alt") return;
        projectFromPointer(lastClientX, lastClientY, keyEvent.type === "keydown");
      };

      const endDragSession = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("keydown", onAltChange);
        window.removeEventListener("keyup", onAltChange);
        document.body.style.cursor = "";
        endDragSessionRef.current = null;
      };

      endDragSessionRef.current = endDragSession;

      const onPointerUp = (upEvent: PointerEvent) => {
        endDragSession();

        const next = projectAt(
          upEvent.clientX,
          upEvent.clientY,
          sku,
          mode,
          itemId,
          upEvent.altKey,
        );

        if (next?.projection.ok) {
          if (mode === "item" && itemId) {
            onCommitRef.current({
              kind: "item",
              itemId,
              shelfId: next.projection.shelfId,
              x: next.projection.x,
              y: next.projection.y,
            });
          } else {
            onCommitRef.current({
              kind: "palette",
              shelfId: next.projection.shelfId,
              x: next.projection.x,
              y: next.projection.y,
              sku,
            });
          }
        } else if (next && !next.projection.ok) {
          onDropRejectedRef.current?.(next.projection.reason);
        }
        setDrag(null);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("keydown", onAltChange);
      window.addEventListener("keyup", onAltChange);

      const next = projectAt(
        event.clientX,
        event.clientY,
        sku,
        mode,
        itemId,
        event.altKey,
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
    endDragSessionRef.current?.();
    setDrag(null);
  }, []);

  return { drag, startDrag, startItemDrag, cancelDrag };
}
