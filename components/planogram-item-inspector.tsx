"use client";

import { Button } from "@/components/ui/button";
import type { PlanogramState } from "@/lib/planogram-engine";
import type { ShelfLayoutMode } from "@/lib/planogram-engine/shelf-helpers";
import type { Sku } from "@/lib/skus/queries";
import { MinusIcon, PlusIcon } from "lucide-react";

function findItem(state: PlanogramState, itemId: string) {
  for (const shelf of state.shelves) {
    const item = shelf.items.find((row) => row.id === itemId);
    if (item) {
      return { shelf, item };
    }
  }
  return null;
}

const SHELF_LAYOUT_ACTIONS: Array<{ mode: ShelfLayoutMode; label: string }> = [
  { mode: "compact", label: "Compact" },
  { mode: "left", label: "Left" },
  { mode: "right", label: "Right" },
  { mode: "center", label: "Center" },
  { mode: "even", label: "Even" },
];

export default function PlanogramItemInspector({
  state,
  selectedItemId,
  skuById,
  canWrite = true,
  onChangeFacings,
  onShelfLayout,
}: {
  state: PlanogramState;
  selectedItemId: string | null;
  skuById: Map<string, Sku>;
  canWrite?: boolean;
  onChangeFacings: (delta: number) => void;
  onShelfLayout: (mode: ShelfLayoutMode) => void;
}) {
  if (!selectedItemId) return null;

  const found = findItem(state, selectedItemId);
  if (!found) return null;

  const { shelf, item } = found;
  const sku = skuById.get(item.skuId);
  const footprintWidth = item.width * item.facingsWide;
  const baseRowCount = shelf.items.filter((row) => row.y === 0).length;

  return (
    <div className="absolute bottom-3 right-3 z-30 w-56 border bg-background/95 p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest">
        Selection
      </p>
      <dl className="mt-2 space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Product</dt>
          <dd className="truncate text-right">{sku?.name ?? "Unknown"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">SKU</dt>
          <dd className="font-mono">{sku?.sku ?? item.skuId.slice(0, 8)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Shelf</dt>
          <dd className="font-mono">{shelf.index + 1}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">X</dt>
          <dd className="font-mono">{item.x} mm</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Y</dt>
          <dd className="font-mono">{item.y} mm</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Unit</dt>
          <dd className="font-mono">
            {item.width} × {item.height} mm
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Facings</dt>
          <dd className="flex items-center gap-1">
            {canWrite ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() => onChangeFacings(-1)}
                  disabled={item.facingsWide <= 1}
                  title="Decrease facings (Shift+3)"
                >
                  <MinusIcon className="size-3" />
                </Button>
                <span className="min-w-6 text-center font-mono">
                  {item.facingsWide}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() => onChangeFacings(1)}
                  disabled={item.facingsWide >= 99}
                  title="Increase facings (3)"
                >
                  <PlusIcon className="size-3" />
                </Button>
              </>
            ) : (
              <span className="font-mono">{item.facingsWide}</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Footprint</dt>
          <dd className="font-mono">{footprintWidth} mm wide</dd>
        </div>
      </dl>

      {canWrite && baseRowCount > 0 ? (
        <div className="mt-3 border-t pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Shelf row
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {SHELF_LAYOUT_ACTIONS.map(({ mode, label }) => (
              <Button
                key={mode}
                type="button"
                variant="outline"
                size="xs"
                disabled={baseRowCount === 0}
                onClick={() => onShelfLayout(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-muted-foreground">
        {canWrite
          ? "Alt float · 3 / Shift+3 facings · Arrow nudge · Delete removes"
          : "View-only selection details"}
      </p>
    </div>
  );
}
