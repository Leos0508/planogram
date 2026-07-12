"use client";

import { mmToPx } from "@/lib/planogram-engine";
import type { DragSku } from "@/hooks/use-planogram-drag";

export default function DragItemPreview({
  sku,
  clientX,
  clientY,
  valid,
}: {
  sku: DragSku;
  clientX: number;
  clientY: number;
  valid: boolean;
}) {
  const widthPx = mmToPx(sku.width);
  const heightPx = mmToPx(sku.height);

  return (
    <div
      className="pointer-events-none fixed z-50 flex flex-col items-center justify-end border-2 bg-primary/25 shadow-md"
      style={{
        left: clientX,
        top: clientY,
        width: widthPx,
        height: heightPx,
        transform: "translate(-50%, -100%)",
        borderColor: valid ? "var(--canvas-valid)" : "var(--color-destructive)",
      }}
    >
      <span className="mb-1 max-w-full truncate px-1 text-[10px] leading-tight text-foreground">
        {sku.name}
      </span>
    </div>
  );
}
