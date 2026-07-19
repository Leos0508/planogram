"use client";

import {
  CANVAS_LABEL_PADDING_PX,
  computeContentWidthMm,
  minContentWidthFloorMm,
  pointerPxToMm,
  type PlanogramState,
} from "@/lib/planogram-engine";
import { useCallback, useEffect, useRef, useState } from "react";

export type ShelfWidthResizeState = {
  /** Handle that started the drag (any shelf; width applies to all). */
  shelfId: string;
  minContentWidthMm: number;
};

function sharedWidthFloorMm(state: PlanogramState): number {
  let floor = 0;
  for (const shelf of state.shelves) {
    floor = Math.max(floor, minContentWidthFloorMm(shelf.items));
  }
  return floor;
}

/** v1: primary handle is the shelf right edge (`ew-resize`). Shared fixture width. */
export function useShelfWidthResize({
  clientToCanvasLocal,
  state,
  onCommit,
}: {
  clientToCanvasLocal: (clientX: number, clientY: number) => {
    x: number;
    y: number;
  } | null;
  state: PlanogramState;
  onCommit: (shelfId: string, minContentWidthMm: number) => void;
}) {
  const [resize, setResize] = useState<ShelfWidthResizeState | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pointerPlanogramX = useCallback(
    (clientX: number, clientY: number) => {
      const pointerPx = clientToCanvasLocal(clientX, clientY);
      if (!pointerPx) return null;

      const pointerMm = pointerPxToMm({
        x: Math.max(0, pointerPx.x - CANVAS_LABEL_PADDING_PX),
        y: pointerPx.y,
      });

      return pointerMm.x;
    },
    [clientToCanvasLocal],
  );

  const computeMin = useCallback(
    (
      clientX: number,
      clientY: number,
      startMin: number,
      startPointerXMm: number,
    ) => {
      const pointerX = pointerPlanogramX(clientX, clientY);
      if (pointerX === null) return null;

      const delta = pointerX - startPointerXMm;
      const floor = sharedWidthFloorMm(stateRef.current);
      return Math.max(floor, Math.round(startMin + delta));
    },
    [pointerPlanogramX],
  );

  const startResize = useCallback(
    (shelfId: string, event: React.PointerEvent) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      const shelf = stateRef.current.shelves.find((row) => row.id === shelfId);
      if (!shelf) return;

      const startPointerXMm = pointerPlanogramX(event.clientX, event.clientY);
      if (startPointerXMm === null) return;

      // Visual edge is shared content width, not this shelf's lagging min.
      const startMin = computeContentWidthMm(stateRef.current.shelves);
      document.body.style.cursor = "ew-resize";

      const onPointerMove = (moveEvent: PointerEvent) => {
        const nextMin = computeMin(
          moveEvent.clientX,
          moveEvent.clientY,
          startMin,
          startPointerXMm,
        );
        if (nextMin !== null) {
          setResize({ shelfId, minContentWidthMm: nextMin });
        }
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        document.body.style.cursor = "";

        const nextMin = computeMin(
          upEvent.clientX,
          upEvent.clientY,
          startMin,
          startPointerXMm,
        );
        if (nextMin !== null) {
          onCommit(shelfId, nextMin);
        }
        setResize(null);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [computeMin, onCommit, pointerPlanogramX],
  );

  return { resize, startResize };
}
