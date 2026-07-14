"use client";

import {
  CANVAS_LABEL_PADDING_PX,
  computePlanogramLayoutCached,
  minContentHeightFloorMm,
  pointerPxToMm,
  type PlanogramState,
} from "@/lib/planogram-engine";
import { useCallback, useEffect, useRef, useState } from "react";

export type ShelfResizeState = {
  shelfId: string;
  minContentHeightMm: number;
};

export function useShelfResize({
  clientToCanvasLocal,
  state,
  onCommit,
}: {
  clientToCanvasLocal: (clientX: number, clientY: number) => {
    x: number;
    y: number;
  } | null;
  state: PlanogramState;
  onCommit: (shelfId: string, minContentHeightMm: number) => void;
}) {
  const [resize, setResize] = useState<ShelfResizeState | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pointerPlanogramY = useCallback(
    (clientX: number, clientY: number) => {
      const pointerPx = clientToCanvasLocal(clientX, clientY);
      if (!pointerPx) return null;

      const pointerMm = pointerPxToMm({
        x: Math.max(0, pointerPx.x - CANVAS_LABEL_PADDING_PX),
        y: pointerPx.y,
      });

      const layout = computePlanogramLayoutCached(stateRef.current);
      return layout.bounds.y + pointerMm.y;
    },
    [clientToCanvasLocal],
  );

  const computeMin = useCallback(
    (
      clientX: number,
      clientY: number,
      shelfId: string,
      startMin: number,
      startPointerYMm: number,
    ) => {
      const pointerY = pointerPlanogramY(clientX, clientY);
      if (pointerY === null) return null;

      const shelf = stateRef.current.shelves.find((row) => row.id === shelfId);
      if (!shelf) return null;

      const delta = pointerY - startPointerYMm;
      const floor = minContentHeightFloorMm(shelf.items);
      return Math.max(floor, Math.round(startMin + delta));
    },
    [pointerPlanogramY],
  );

  const startResize = useCallback(
    (shelfId: string, event: React.PointerEvent) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      const shelf = stateRef.current.shelves.find((row) => row.id === shelfId);
      if (!shelf) return;

      const startPointerYMm = pointerPlanogramY(event.clientX, event.clientY);
      if (startPointerYMm === null) return;

      const startMin = shelf.minContentHeightMm;
      document.body.style.cursor = "ns-resize";

      const onPointerMove = (moveEvent: PointerEvent) => {
        const nextMin = computeMin(
          moveEvent.clientX,
          moveEvent.clientY,
          shelfId,
          startMin,
          startPointerYMm,
        );
        if (nextMin !== null) {
          setResize({ shelfId, minContentHeightMm: nextMin });
        }
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        document.body.style.cursor = "";

        const nextMin = computeMin(
          upEvent.clientX,
          upEvent.clientY,
          shelfId,
          startMin,
          startPointerYMm,
        );
        if (nextMin !== null) {
          onCommit(shelfId, nextMin);
        }
        setResize(null);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [computeMin, onCommit, pointerPlanogramY],
  );

  return { resize, startResize };
}
