"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_SHELF_WIDTH_MM } from "@/lib/planogram-engine/constant";
import { minContentWidthFloorMm } from "@/lib/planogram-engine/layout";
import {
  addPlanogramShelf,
  removePlanogramShelf,
  updatePlanogram,
  updatePlanogramShelfMinWidth,
} from "@/lib/planograms/actions";
import type { PlanogramDetail } from "@/lib/planograms/queries";
import { shelfDisplayLabel } from "@/lib/planograms/shelf-label";
import {
  parseNonNegativeInt,
  parsePositiveInt,
} from "@/lib/validation/sku";
import { WORKSPACE_READ_ONLY_HINT } from "@/lib/workspaces/capabilities";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function PlanogramSettingsPanel({
  planogram,
  canWrite,
}: {
  planogram: PlanogramDetail;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const shelves = [...planogram.shelves].sort((a, b) => a.index - b.index);
  const sharedFixtureWidthMm =
    shelves[0]?.minContentWidthMm ?? MIN_SHELF_WIDTH_MM;

  const [name, setName] = useState(planogram.name);
  const [topClearance, setTopClearance] = useState(String(planogram.topClearance));
  const [stackGap, setStackGap] = useState(String(planogram.stackGap));
  const [fixtureWidth, setFixtureWidth] = useState(String(sharedFixtureWidthMm));

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite) return;
    setError(null);
    setMessage(null);

    const clearance = parseNonNegativeInt(topClearance);
    const gap = parseNonNegativeInt(stackGap);
    const width = parsePositiveInt(fixtureWidth);
    if (clearance === null || gap === null) {
      setError("Clearance and gap must be non-negative integers (mm)");
      return;
    }
    if (width === null) {
      setError("Fixture width must be a positive integer (mm)");
      return;
    }

    const itemFloor = Math.max(
      MIN_SHELF_WIDTH_MM,
      ...shelves.map((shelf) => minContentWidthFloorMm(shelf.items)),
    );
    if (width < itemFloor) {
      setError(`Fixture width must be at least ${itemFloor} mm`);
      return;
    }

    const anchorShelfId = shelves[0]?.id;
    if (!anchorShelfId) {
      setError("Add a shelf before setting fixture width");
      return;
    }

    startTransition(async () => {
      const result = await updatePlanogram({
        id: planogram.id,
        name: name.trim(),
        topClearance: clearance,
        stackGap: gap,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      const widthResult = await updatePlanogramShelfMinWidth({
        planogramId: planogram.id,
        shelfId: anchorShelfId,
        minContentWidthMm: width,
        syncAllShelves: true,
      });
      if (!widthResult.ok) {
        setError(widthResult.message);
        return;
      }

      setMessage("Settings saved");
      router.refresh();
    });
  };

  const handleAddShelf = () => {
    if (!canWrite) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await addPlanogramShelf({ planogramId: planogram.id });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Shelf added");
      router.refresh();
    });
  };

  const handleRemoveShelf = (shelfId: string, index: number) => {
    if (!canWrite) return;
    if (!window.confirm(`Remove shelf ${index + 1}?`)) return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await removePlanogramShelf({
        planogramId: planogram.id,
        shelfId,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Shelf removed");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {!canWrite ? (
        <p className="text-xs text-muted-foreground">{WORKSPACE_READ_ONLY_HINT}</p>
      ) : null}

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-name">Name</Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={!canWrite || pending}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-clearance">Top clearance (mm)</Label>
            <Input
              id="settings-clearance"
              type="number"
              min={0}
              value={topClearance}
              onChange={(event) => setTopClearance(event.target.value)}
              className="font-mono"
              required
              disabled={!canWrite || pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-gap">Stack gap (mm)</Label>
            <Input
              id="settings-gap"
              type="number"
              min={0}
              value={stackGap}
              onChange={(event) => setStackGap(event.target.value)}
              className="font-mono"
              required
              disabled={!canWrite || pending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-fixture-width">Fixture width (mm)</Label>
          <Input
            id="settings-fixture-width"
            type="number"
            min={MIN_SHELF_WIDTH_MM}
            value={fixtureWidth}
            onChange={(event) => setFixtureWidth(event.target.value)}
            className="font-mono"
            required
            disabled={!canWrite || pending}
          />
          <p className="text-xs text-muted-foreground">
            Shared across shelves (same as drag-resize). Empty shelves keep this
            width; placement cannot exceed it.
          </p>
        </div>

        {canWrite ? (
          <Button type="submit" size="sm" disabled={pending}>
            Save settings
          </Button>
        ) : null}
      </form>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest">
            Shelves
          </span>
          {canWrite ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleAddShelf}
              disabled={pending}
            >
              <PlusIcon className="size-3" />
              Add
            </Button>
          ) : null}
        </div>

        <ul className="flex flex-col gap-1">
          {shelves.map((shelf) => (
            <li
              key={shelf.id}
              className="flex items-center justify-between gap-2 border bg-card px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs">
                {shelfDisplayLabel(shelf.index)}
                <span className="ml-2 text-muted-foreground">
                  {shelf.items.length} item{shelf.items.length === 1 ? "" : "s"}
                  <span className="ml-2">· {shelf.minContentWidthMm} mm</span>
                </span>
              </span>
              {canWrite ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title={`Remove shelf ${shelf.index + 1}`}
                  disabled={pending || shelves.length <= 1}
                  onClick={() => handleRemoveShelf(shelf.id, shelf.index)}
                >
                  <Trash2Icon className="size-3 text-destructive" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {canWrite
          ? "Drag SKUs from the bottom tray onto a shelf. Select an item and press Delete to remove it."
          : "View-only: placement and settings cannot be changed."}
      </p>
    </div>
  );
}
