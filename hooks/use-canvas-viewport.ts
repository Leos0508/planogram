"use client";

import { CANVAS_LABEL_PADDING_PX } from "@/lib/planogram-engine/constant";
import { useCallback, useEffect, useRef, useState } from "react";

export type ViewportTransform = {
  x: number;
  y: number;
  scale: number;
};

const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useCanvasViewport(canvasRef: React.RefObject<HTMLElement | null>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ViewportTransform>({ x: 0, y: 0, scale: 1 });
  const applyTransformRef = useRef<(next: ViewportTransform) => void>(() => {});
  const [transform, setTransform] = useState<ViewportTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const panningRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const applyTransform = useCallback((next: ViewportTransform) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  useEffect(() => {
    applyTransformRef.current = applyTransform;
  }, [applyTransform]);

  const clientToCanvasLocal = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const { scale } = transformRef.current;

    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }, [canvasRef]);

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;

    const viewportRect = viewport.getBoundingClientRect();
    const contentWidth = canvas.offsetWidth;
    const contentHeight = canvas.offsetHeight;

    if (contentWidth <= 0 || contentHeight <= 0 || viewportRect.width <= 0) {
      return;
    }

    const scale = clamp(
      Math.min(
        viewportRect.width / contentWidth,
        viewportRect.height / contentHeight,
      ) * 0.92,
      MIN_SCALE,
      MAX_SCALE,
    );
    const x = (viewportRect.width - contentWidth * scale) / 2;
    const y = Math.max(16, (viewportRect.height - contentHeight * scale) / 2);

    applyTransform({ x, y, scale });
  }, [applyTransform, canvasRef]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = viewport.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const { x, y, scale } = transformRef.current;

      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);

      applyTransformRef.current({
        x: mx - ((mx - x) * nextScale) / scale,
        y: my - ((my - y) * nextScale) / scale,
        scale: nextScale,
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const endPan = (event?: PointerEvent) => {
      const pan = panningRef.current;
      if (!pan) return;

      const viewport = viewportRef.current;
      if (viewport?.hasPointerCapture(pan.pointerId)) {
        viewport.releasePointerCapture(pan.pointerId);
      }

      panningRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (event) {
        event.preventDefault();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const pan = panningRef.current;
      if (!pan || pan.pointerId !== event.pointerId) return;

      event.preventDefault();
      applyTransformRef.current({
        ...transformRef.current,
        x: pan.originX + (event.clientX - pan.startX),
        y: pan.originY + (event.clientY - pan.startY),
      });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (panningRef.current?.pointerId !== event.pointerId) return;
      endPan(event);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 1) return;

      const viewport = viewportRef.current;
      if (!viewport) return;

      const target = event.target as Node | null;
      if (!target || !viewport.contains(target)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      panningRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: transformRef.current.x,
        originY: transformRef.current.y,
      };

      viewport.setPointerCapture(event.pointerId);

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      endPan();
    };
  }, []);

  return {
    viewportRef,
    transform,
    clientToCanvasLocal,
    fitToView,
  };
}

export { CANVAS_LABEL_PADDING_PX };
