"use client";

import { cn } from "@/lib/utils";

/**
 * Live 2D face-on footprint preview (width × height mm) for parametric packaging.
 */
export function SkuPackagingFacePreview({
  widthMm,
  heightMm,
  color,
  className,
}: {
  widthMm: number;
  heightMm: number;
  color: string;
  className?: string;
}) {
  const maxSide = Math.max(widthMm, heightMm, 1);
  const scale = 160 / maxSide;
  const w = Math.max(widthMm * scale, 4);
  const h = Math.max(heightMm * scale, 4);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 border border-border bg-muted/20 p-4",
        className,
      )}
      aria-label={`Face-on footprint ${Math.round(widthMm)} by ${Math.round(heightMm)} millimeters`}
    >
      <svg
        width={Math.ceil(w) + 2}
        height={Math.ceil(h) + 2}
        viewBox={`0 0 ${w + 2} ${h + 2}`}
        className="shrink-0"
        role="img"
        aria-hidden
      >
        <rect
          x={1}
          y={1}
          width={w}
          height={h}
          rx={2}
          fill={color}
          fillOpacity={0.35}
          stroke="var(--primary)"
          strokeWidth={1.5}
        />
      </svg>
      <p className="font-mono text-xs text-muted-foreground">
        {Math.round(widthMm)} × {Math.round(heightMm)} mm face-on
      </p>
    </div>
  );
}
