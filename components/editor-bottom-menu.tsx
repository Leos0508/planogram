"use client";

import { Button } from "@/components/ui/button";
import { DragSku } from "@/hooks/use-planogram-drag";
import { cn } from "@/lib/utils";
import { WORKSPACE_READ_ONLY_HINT } from "@/lib/workspaces/capabilities";
import { Sku } from "@/lib/skus/queries";
import { isValidSkuFootprint } from "@/lib/validation/sku";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import SkuCard from "./sku-card";

export default function EditorBottomMenu({
  skus,
  canWrite,
  onSkuPointerDown,
  open,
  onToggle,
}: {
  skus: Sku[];
  canWrite: boolean;
  onSkuPointerDown: (sku: DragSku, event: React.PointerEvent) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const placeableSkus = skus.filter((sku) =>
    isValidSkuFootprint(sku.width, sku.height),
  );
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-t bg-sidebar text-sidebar-foreground",
        open ? "min-h-0" : "h-10 overflow-hidden",
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-2 py-1">
        <span
          className={cn(
            "px-2 text-xs font-semibold uppercase tracking-widest",
            !open && "text-muted-foreground",
          )}
        >
          SKUs
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          title={open ? "Collapse SKU tray" : "Expand SKU tray"}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronUpIcon className="size-4" />
          )}
        </Button>
      </div>

      {open ? (
        <div className="flex items-start gap-2 overflow-x-auto p-3">
          {!canWrite ? (
            <p className="px-2 text-xs text-muted-foreground">
              {WORKSPACE_READ_ONLY_HINT}
            </p>
          ) : placeableSkus.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">
              No placeable SKUs. Add products with width and height in mm on the
              SKUs page.
            </p>
          ) : (
            placeableSkus.map((sku) => (
              <SkuCard
                key={sku.id}
                sku={sku}
                onPointerDown={onSkuPointerDown}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
