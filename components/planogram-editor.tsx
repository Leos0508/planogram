"use client";

import DragItemPreview from "@/components/drag-item-preview";
import EditorBottomMenu from "@/components/editor-bottom-menu";
import Planogram3DPreview from "@/components/planogram-3d-preview";
import PlanogramCanvas from "@/components/planogram-canvas";
import PlanogramItemInspector from "@/components/planogram-item-inspector";
import PlanogramViewport, {
  type PlanogramViewMode,
} from "@/components/planogram-viewport";
import { useToast } from "@/components/toast-provider";
import { useCanvasViewport } from "@/hooks/use-canvas-viewport";
import {
  usePlanogramDrag,
  type DragCommit,
} from "@/hooks/use-planogram-drag";
import { useShelfResize } from "@/hooks/use-shelf-resize";
import { useShelfWidthResize } from "@/hooks/use-shelf-width-resize";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  addItemToState,
  moveItemInState,
  removeItemFromState,
  setItemFacingsInState,
  setItemsPositionsInState,
  setAllShelvesMinContentWidthInState,
  setShelfMinContentHeightInState,
  setShelfMinContentWidthInState,
  usePlanogramHistory,
  type PlanogramHistoryEntry,
} from "@/hooks/use-planogram-history";
import {
  canPlace,
  computePlanogramLayoutCached,
  computeShelfLayout,
  itemFacingsWide,
  MAX_FACINGS_WIDE,
  nudgeItemX,
  planogramDetailToState,
  validateShelfPlacements,
  type ShelfLayoutMode,
} from "@/lib/planogram-engine";
import type { DropReason, PlanogramItem } from "@/lib/planogram-engine";
import {
  placePlanogramItem,
  removePlanogramItem,
  updatePlanogramItemFacings,
  updatePlanogramItemPosition,
  updatePlanogramShelfMinHeight,
  updatePlanogramShelfMinWidth,
} from "@/lib/planograms/actions";
import type { PlanogramDetail } from "@/lib/planograms/queries";
import { planogramStructureKey } from "@/lib/planogram-editor/sync-key";
import { slugifyPlanogramExportName } from "@/lib/planogram-export/filename";
import {
  printPlanogramExportHtml,
  renderPlanogramExportHtml,
} from "@/lib/planogram-export/render-export-html";
import {
  downloadPlanogramSvg,
  renderPlanogramSvg,
} from "@/lib/planogram-export/render-svg";
import type { Sku } from "@/lib/skus/queries";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
}

export default function PlanogramEditor({
  planogram,
  skus,
  canWrite,
  bottomMenuOpen,
  onBottomMenuToggle,
  panelLayoutKey,
}: {
  planogram: PlanogramDetail;
  skus: Sku[];
  canWrite: boolean;
  bottomMenuOpen: boolean;
  onBottomMenuToggle: () => void;
  panelLayoutKey: string;
}) {
  const toast = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(() => planogramDetailToState(planogram));
  const stateRef = useRef(state);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<PlanogramViewMode>("2d");
  const [fit3dToken, setFit3dToken] = useState(0);
  const history = usePlanogramHistory();
  const historyRef = useRef(history);
  const applyingHistoryRef = useRef(false);
  const syncedStructureKeyRef = useRef<string | null>(null);
  const structureKey = useMemo(
    () => planogramStructureKey(planogram),
    [planogram],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    if (syncedStructureKeyRef.current === structureKey) return;
    syncedStructureKeyRef.current = structureKey;
    setState(planogramDetailToState(planogram));
    setSelectedItemId(null);
    historyRef.current.clear();
  }, [structureKey, planogram]);

  const skuById = useMemo(
    () => new Map(skus.map((sku) => [sku.id, sku])),
    [skus],
  );

  const applyHistoryEntry = useCallback(
    async (entry: PlanogramHistoryEntry) => {
      applyingHistoryRef.current = true;
      try {
        switch (entry.type) {
          case "place": {
            setState((prev) => addItemToState(prev, entry.item));
            setSelectedItemId(entry.item.id);
            const response = await placePlanogramItem({
              planogramId: planogram.id,
              shelfId: entry.item.shelfId,
              skuId: entry.item.skuId,
              x: entry.item.x,
              y: entry.item.y,
              facingsWide: entry.item.facingsWide,
            });
            if (!response.ok) {
              setState((prev) => removeItemFromState(prev, entry.item.id));
              setSelectedItemId(null);
              console.error("[undo/redo place]", response.message);
              toast.error(response.message);
              return;
            }
            setState((prev) => {
              const without = removeItemFromState(prev, entry.item.id);
              return addItemToState(without, {
                ...entry.item,
                id: response.data.id,
                shelfId: response.data.planogramShelfId,
                x: response.data.x,
                y: response.data.y,
                facingsWide: response.data.facingsWide,
              });
            });
            setSelectedItemId(response.data.id);
            break;
          }
          case "delete": {
            setState((prev) => removeItemFromState(prev, entry.item.id));
            setSelectedItemId((current) =>
              current === entry.item.id ? null : current,
            );
            const response = await removePlanogramItem({
              planogramId: planogram.id,
              itemId: entry.item.id,
            });
            if (!response.ok) {
              setState((prev) => addItemToState(prev, entry.item));
              console.error("[undo/redo delete]", response.message);
              toast.error(response.message);
            }
            break;
          }
          case "move": {
            setState((prev) =>
              moveItemInState(prev, entry.itemId, entry.to),
            );
            setSelectedItemId(entry.itemId);
            const response = await updatePlanogramItemPosition({
              planogramId: planogram.id,
              itemId: entry.itemId,
              shelfId: entry.to.shelfId,
              x: entry.to.x,
              y: entry.to.y,
            });
            if (!response.ok) {
              setState((prev) =>
                moveItemInState(prev, entry.itemId, entry.from),
              );
              console.error("[undo/redo move]", response.message);
              toast.error(response.message);
            }
            break;
          }
          case "facings": {
            setState((prev) =>
              setItemFacingsInState(prev, entry.itemId, entry.to),
            );
            const response = await updatePlanogramItemFacings({
              planogramId: planogram.id,
              itemId: entry.itemId,
              facingsWide: entry.to,
            });
            if (!response.ok) {
              setState((prev) =>
                setItemFacingsInState(prev, entry.itemId, entry.from),
              );
              console.error("[undo/redo facings]", response.message);
              toast.error(response.message);
            }
            break;
          }
          case "batchMove": {
            setState((prev) =>
              setItemsPositionsInState(
                prev,
                entry.moves.map((move) => ({
                  itemId: move.itemId,
                  x: move.to.x,
                })),
              ),
            );
            for (const move of entry.moves) {
              const response = await updatePlanogramItemPosition({
                planogramId: planogram.id,
                itemId: move.itemId,
                shelfId: move.to.shelfId,
                x: move.to.x,
                y: move.to.y,
              });
              if (!response.ok) {
                setState((prev) =>
                  setItemsPositionsInState(
                    prev,
                    entry.moves.map((row) => ({
                      itemId: row.itemId,
                      x: row.from.x,
                    })),
                  ),
                );
                console.error("[undo/redo batchMove]", response.message);
                toast.error(response.message);
                break;
              }
            }
            break;
          }
        }
      } finally {
        applyingHistoryRef.current = false;
      }
    },
    [planogram.id, toast],
  );

  const changeFacings = useCallback(
    async (itemId: string, delta: number) => {
      if (!canWrite) return;
      const found = stateRef.current.shelves
        .flatMap((shelf) => shelf.items.map((item) => ({ shelf, item })))
        .find(({ item }) => item.id === itemId);
      if (!found) return;

      const from = itemFacingsWide(found.item);
      const to = Math.min(MAX_FACINGS_WIDE, Math.max(1, from + delta));
      if (to === from) return;

      const candidate: PlanogramItem = { ...found.item, facingsWide: to };
      const placement = canPlace(
        candidate,
        found.shelf.id,
        stateRef.current.shelves,
        stateRef.current.config,
      );
      if (!placement.ok) {
        toast.error("Not enough space for more facings");
        return;
      }

      setState((prev) => setItemFacingsInState(prev, itemId, to));

      const response = await updatePlanogramItemFacings({
        planogramId: planogram.id,
        itemId,
        facingsWide: to,
      });

      if (!response.ok) {
        setState((prev) => setItemFacingsInState(prev, itemId, from));
        console.error("[updatePlanogramItemFacings]", response.message);
        toast.error(response.message);
        return;
      }

      if (!applyingHistoryRef.current) {
        historyRef.current.push({ type: "facings", itemId, from, to });
      }
    },
    [canWrite, planogram.id, toast],
  );

  const handleUndo = useCallback(async () => {
    if (!canWrite) return;
    const entry = historyRef.current.popUndo();
    if (!entry) return;
    await applyHistoryEntry(historyRef.current.invert(entry));
  }, [applyHistoryEntry, canWrite]);

  const handleRedo = useCallback(async () => {
    if (!canWrite) return;
    const entry = historyRef.current.popRedo();
    if (!entry) return;
    await applyHistoryEntry(entry);
  }, [applyHistoryEntry, canWrite]);

  const persistMove = useCallback(
    async (
      itemId: string,
      from: { shelfId: string; x: number; y: number },
      to: { shelfId: string; x: number; y: number },
      recordHistory: boolean,
    ) => {
      const response = await updatePlanogramItemPosition({
        planogramId: planogram.id,
        itemId,
        shelfId: to.shelfId,
        x: to.x,
        y: to.y,
      });

      if (!response.ok) {
        setState((prev) => moveItemInState(prev, itemId, from));
        console.error("[updatePlanogramItemPosition]", response.message);
        toast.error(response.message);
        return false;
      }

      if (recordHistory && !applyingHistoryRef.current) {
        historyRef.current.push({ type: "move", itemId, from, to });
      }
      return true;
    },
    [planogram.id, toast],
  );

  type NudgePersistPayload = {
    itemId: string;
    from: { shelfId: string; x: number; y: number };
    to: { shelfId: string; x: number; y: number };
  };

  const nudgeOriginRef = useRef<{
    itemId: string;
    from: { shelfId: string; x: number; y: number };
  } | null>(null);

  const { schedule: scheduleNudgePersist, flush: flushNudgePersist } =
    useDebouncedCallback<NudgePersistPayload>(async (payload) => {
      await persistMove(payload.itemId, payload.from, payload.to, true);
      if (nudgeOriginRef.current?.itemId === payload.itemId) {
        nudgeOriginRef.current = null;
      }
    }, 400);

  const onCommit = useCallback(
    async (result: DragCommit) => {
      if (!canWrite) return;
      if (result.kind === "palette") {
        const tempId = crypto.randomUUID();
        const optimisticItem: PlanogramItem = {
          id: tempId,
          shelfId: result.shelfId,
          skuId: result.sku.id,
          x: result.x,
          width: result.sku.width,
          height: result.sku.height,
          y: result.y,
          facingsWide: 1,
        };

        setState((prev) => addItemToState(prev, optimisticItem));

        const response = await placePlanogramItem({
          planogramId: planogram.id,
          shelfId: result.shelfId,
          skuId: result.sku.id,
          x: result.x,
          y: result.y,
        });

        if (response.ok) {
          const placed: PlanogramItem = {
            ...optimisticItem,
            id: response.data.id,
            x: response.data.x,
            y: response.data.y,
            shelfId: response.data.planogramShelfId,
            facingsWide: response.data.facingsWide,
          };
          setState((prev) => {
            const without = removeItemFromState(prev, tempId);
            return addItemToState(without, placed);
          });
          setSelectedItemId(response.data.id);
          if (!applyingHistoryRef.current) {
            historyRef.current.push({ type: "place", item: placed });
          }
        } else {
          setState((prev) => removeItemFromState(prev, tempId));
          console.error("[placePlanogramItem]", response.message);
          toast.error(response.message);
        }
        return;
      }

      const found = stateRef.current.shelves
        .flatMap((shelf) => shelf.items.map((item) => ({ shelf, item })))
        .find(({ item }) => item.id === result.itemId);
      if (!found) return;

      const from = {
        shelfId: found.item.shelfId,
        x: found.item.x,
        y: found.item.y,
      };
      const to = {
        shelfId: result.shelfId,
        x: result.x,
        y: result.y,
      };

      setState((prev) => moveItemInState(prev, result.itemId, to));
      await persistMove(result.itemId, from, to, true);
    },
    [canWrite, persistMove, planogram.id, toast],
  );

  const onDeleteSelected = useCallback(async () => {
    if (!canWrite || !selectedItemId) return;

    const found = stateRef.current.shelves
      .flatMap((shelf) => shelf.items.map((item) => ({ shelf, item })))
      .find(({ item }) => item.id === selectedItemId);
    if (!found) return;

    const item = found.item;
    const itemId = selectedItemId;

    setState((prev) => removeItemFromState(prev, itemId));
    setSelectedItemId(null);

    const response = await removePlanogramItem({
      planogramId: planogram.id,
      itemId,
    });

    if (!response.ok) {
      setState((prev) => addItemToState(prev, item));
      console.error("[removePlanogramItem]", response.message);
      toast.error(response.message);
      return;
    }

    if (!applyingHistoryRef.current) {
      historyRef.current.push({ type: "delete", item });
    }
  }, [canWrite, planogram.id, selectedItemId, toast]);

  const changeSelectedFacings = useCallback(
    (delta: number) => {
      if (!selectedItemId) return;
      void changeFacings(selectedItemId, delta);
    },
    [changeFacings, selectedItemId],
  );

  const {
    viewportRef,
    transform,
    clientToCanvasLocal,
    fitToView,
  } = useCanvasViewport(canvasRef, { enabled: viewMode === "2d" });

  const handleFitToView = useCallback(() => {
    if (viewMode === "3d") {
      setFit3dToken((token) => token + 1);
      return;
    }
    fitToView();
  }, [fitToView, viewMode]);

  const onDropRejected = useCallback(
    (reason: DropReason) => {
      if (reason === "OUT_OF_BAND") {
        toast.error("Resize shelf first");
      }
    },
    [toast],
  );

  const persistShelfResize = useCallback(
    async (shelfId: string, minContentHeightMm: number) => {
      if (!canWrite) return;
      const shelf = stateRef.current.shelves.find((row) => row.id === shelfId);
      if (!shelf || shelf.minContentHeightMm === minContentHeightMm) return;

      const from = shelf.minContentHeightMm;
      setState((prev) =>
        setShelfMinContentHeightInState(prev, shelfId, minContentHeightMm),
      );

      const response = await updatePlanogramShelfMinHeight({
        planogramId: planogram.id,
        shelfId,
        minContentHeightMm,
      });

      if (!response.ok) {
        setState((prev) =>
          setShelfMinContentHeightInState(prev, shelfId, from),
        );
        console.error("[updatePlanogramShelfMinHeight]", response.message);
        toast.error(response.message);
      }
    },
    [canWrite, planogram.id, toast],
  );

  const persistShelfWidthResize = useCallback(
    async (_shelfId: string, minContentWidthMm: number) => {
      if (!canWrite) return;
      const previous = stateRef.current.shelves.map((shelf) => ({
        id: shelf.id,
        minContentWidthMm: shelf.minContentWidthMm,
      }));
      if (
        previous.length > 0 &&
        previous.every((shelf) => shelf.minContentWidthMm === minContentWidthMm)
      ) {
        return;
      }

      setState((prev) =>
        setAllShelvesMinContentWidthInState(prev, minContentWidthMm),
      );

      const response = await updatePlanogramShelfMinWidth({
        planogramId: planogram.id,
        shelfId: previous[0]?.id ?? _shelfId,
        minContentWidthMm,
        syncAllShelves: true,
      });

      if (!response.ok) {
        setState((prev) => {
          let next = prev;
          for (const shelf of previous) {
            next = setShelfMinContentWidthInState(
              next,
              shelf.id,
              shelf.minContentWidthMm,
            );
          }
          return next;
        });
        console.error("[updatePlanogramShelfMinWidth]", response.message);
        toast.error(response.message);
      }
    },
    [canWrite, planogram.id, toast],
  );

  const { drag, startDrag, startItemDrag, cancelDrag } = usePlanogramDrag({
    clientToCanvasLocal,
    state,
    viewportScale: transform.scale,
    onCommit,
    onDropRejected,
  });

  const handleViewModeChange = useCallback(
    (mode: PlanogramViewMode) => {
      if (mode === "3d") {
        cancelDrag();
      }
      setViewMode(mode);
    },
    [cancelDrag],
  );

  const { resize: shelfResize, startResize: startShelfResize } = useShelfResize({
    clientToCanvasLocal,
    state,
    onCommit: persistShelfResize,
  });

  const {
    resize: shelfWidthResize,
    startResize: startShelfWidthResize,
  } = useShelfWidthResize({
    clientToCanvasLocal,
    state,
    onCommit: persistShelfWidthResize,
  });

  const displayState = useMemo(() => {
    let next = state;
    if (shelfResize) {
      next = setShelfMinContentHeightInState(
        next,
        shelfResize.shelfId,
        shelfResize.minContentHeightMm,
      );
    }
    if (shelfWidthResize) {
      next = setAllShelvesMinContentWidthInState(
        next,
        shelfWidthResize.minContentWidthMm,
      );
    }
    return next;
  }, [state, shelfResize, shelfWidthResize]);

  const applyShelfLayout = useCallback(
    async (mode: ShelfLayoutMode) => {
      if (!canWrite || !selectedItemId || drag) return;

      const found = stateRef.current.shelves
        .flatMap((shelf) => shelf.items.map((item) => ({ shelf, item })))
        .find(({ item }) => item.id === selectedItemId);
      if (!found) return;

      const updates = computeShelfLayout(
        mode,
        found.shelf,
        stateRef.current.shelves,
      );
      if (updates.length === 0) return;

      const changed = updates.filter((update) => {
        const item = found.shelf.items.find((row) => row.id === update.itemId);
        return item && item.x !== update.x;
      });
      if (changed.length === 0) return;

      if (
        !validateShelfPlacements(
          found.shelf.id,
          changed,
          stateRef.current.shelves,
          stateRef.current.config,
        )
      ) {
        toast.error("Shelf layout would overlap items");
        return;
      }

      const moves = changed.map((update) => {
        const item = found.shelf.items.find((row) => row.id === update.itemId)!;
        return {
          itemId: update.itemId,
          from: {
            shelfId: item.shelfId,
            x: item.x,
            y: item.y,
          },
          to: {
            shelfId: item.shelfId,
            x: update.x,
            y: item.y,
          },
        };
      });

      setState((prev) =>
        setItemsPositionsInState(
          prev,
          changed.map((update) => ({
            itemId: update.itemId,
            x: update.x,
          })),
        ),
      );

      for (const move of moves) {
        const response = await updatePlanogramItemPosition({
          planogramId: planogram.id,
          itemId: move.itemId,
          shelfId: move.to.shelfId,
          x: move.to.x,
          y: move.to.y,
        });
        if (!response.ok) {
          setState((prev) =>
            setItemsPositionsInState(
              prev,
              moves.map((row) => ({ itemId: row.itemId, x: row.from.x })),
            ),
          );
          console.error("[applyShelfLayout]", response.message);
          toast.error(response.message);
          return;
        }
      }

      if (!applyingHistoryRef.current) {
        historyRef.current.push({ type: "batchMove", moves });
      }
    },
    [canWrite, drag, planogram.id, selectedItemId, toast],
  );

  const buildExportSkuById = useCallback(() => {
    return new Map(
      skus.map((sku) => [
        sku.id,
        {
          id: sku.id,
          name: sku.name,
          sku: sku.sku,
          width: sku.width,
          height: sku.height,
          imageUrl: sku.imageUrl,
          color: sku.color,
        },
      ]),
    );
  }, [skus]);

  const handleExportSvg = useCallback(() => {
    const exportLayout = computePlanogramLayoutCached(stateRef.current);
    const svg = renderPlanogramSvg({
      layout: exportLayout,
      state: stateRef.current,
      skuById: buildExportSkuById(),
      planogramName: planogram.name,
    });
    // Keep SVG naming as `<slug>.svg` (unchanged; no planogram_ prefix).
    const slug = slugifyPlanogramExportName(planogram.name);
    downloadPlanogramSvg(svg, `${slug || "planogram"}.svg`);
  }, [buildExportSkuById, planogram.name]);

  const handleExportPdf = useCallback(() => {
    const exportLayout = computePlanogramLayoutCached(stateRef.current);
    const html = renderPlanogramExportHtml({
      layout: exportLayout,
      state: stateRef.current,
      skuById: buildExportSkuById(),
      planogramName: planogram.name,
    });
    const opened = printPlanogramExportHtml(html);
    if (!opened) {
      toast.error("Allow popups to export PDF.");
    }
  }, [buildExportSkuById, planogram.name, toast]);

  const nudgeSelected = useCallback(
    (deltaMm: number) => {
      if (!canWrite || !selectedItemId || drag) return;

      const placement = nudgeItemX(stateRef.current, selectedItemId, deltaMm);
      if (!placement) return;

      const found = stateRef.current.shelves
        .flatMap((shelf) => shelf.items.map((item) => ({ shelf, item })))
        .find(({ item }) => item.id === selectedItemId);
      if (!found) return;

      const from = {
        shelfId: found.item.shelfId,
        x: found.item.x,
        y: found.item.y,
      };
      const to = {
        shelfId: placement.shelfId,
        x: placement.x,
        y: placement.y,
      };

      if (
        !nudgeOriginRef.current ||
        nudgeOriginRef.current.itemId !== selectedItemId
      ) {
        nudgeOriginRef.current = { itemId: selectedItemId, from };
      }

      setState((prev) => moveItemInState(prev, selectedItemId, to));
      scheduleNudgePersist({
        itemId: selectedItemId,
        from: nudgeOriginRef.current.from,
        to,
      });
    },
    [canWrite, drag, scheduleNudgePersist, selectedItemId],
  );

  const layout = useMemo(() => {
    const draggedItem =
      drag?.mode === "item" && drag.itemId
        ? displayState.shelves
            .flatMap((shelf) => shelf.items)
            .find((item) => item.id === drag.itemId)
        : undefined;

    const previewItem =
      drag?.projection.previewRect && drag.projection.shelfId
        ? {
            shelfId: drag.projection.shelfId,
            skuId: drag.sku.id,
            x: drag.projection.x ?? drag.projection.previewRect.x,
            width: drag.sku.width,
            height: drag.sku.height,
            facingsWide: draggedItem?.facingsWide ?? 1,
            y:
              drag.projection.ok === true ? drag.projection.y : 0,
            id:
              drag.mode === "item" && drag.itemId
                ? drag.itemId
                : "__preview__",
          }
        : undefined;

    return computePlanogramLayoutCached(displayState, previewItem);
  }, [displayState, drag]);

  const activeShelfId =
    drag?.projection.shelfId && drag.projection.ok
      ? drag.projection.shelfId
      : drag?.projection.shelfId ?? null;

  const showCursorPreview = drag && !drag.projection.previewRect;

  useEffect(() => {
    if (viewMode !== "2d") return;
    const frame = requestAnimationFrame(() => fitToView());
    return () => cancelAnimationFrame(frame);
  }, [fitToView, panelLayoutKey, viewMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const mod = event.metaKey || event.ctrlKey;

      if (canWrite && mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        void handleUndo();
        return;
      }

      if (
        canWrite &&
        mod &&
        (event.key.toLowerCase() === "y" ||
          (event.key.toLowerCase() === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        void handleRedo();
        return;
      }

      if (event.key === "Escape" && drag) {
        cancelDrag();
        return;
      }

      if (
        canWrite &&
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedItemId &&
        !drag
      ) {
        event.preventDefault();
        void onDeleteSelected();
        return;
      }

      if (!canWrite || !selectedItemId || drag) return;

      if (event.key === "3") {
        event.preventDefault();
        void changeFacings(selectedItemId, event.shiftKey ? -1 : 1);
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelected(-step);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelected(step);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      flushNudgePersist();
    };
  }, [
    canWrite,
    changeFacings,
    cancelDrag,
    drag,
    flushNudgePersist,
    handleRedo,
    handleUndo,
    nudgeSelected,
    onDeleteSelected,
    selectedItemId,
  ]);

  const handleItemPointerDown = useCallback(
    (
      item: {
        id: string;
        skuId: string;
        x: number;
        width: number;
        height: number;
      },
      event: React.PointerEvent,
    ) => {
      setSelectedItemId(item.id);
      if (!canWrite) return;
      const sku = skuById.get(item.skuId);
      startItemDrag(
        {
          id: item.id,
          skuId: item.skuId,
          width: item.width,
          height: item.height,
          name: sku?.name ?? "Item",
        },
        event,
      );
    },
    [canWrite, skuById, startItemDrag],
  );

  const handleShelfResizePointerDown = useCallback(
    (shelfId: string, event: React.PointerEvent) => {
      if (!canWrite) return;
      startShelfResize(shelfId, event);
    },
    [canWrite, startShelfResize],
  );

  const handleShelfWidthResizePointerDown = useCallback(
    (shelfId: string, event: React.PointerEvent) => {
      if (!canWrite) return;
      startShelfWidthResize(shelfId, event);
    },
    [canWrite, startShelfWidthResize],
  );

  const handleSkuPointerDown = useCallback(
    (sku: Parameters<typeof startDrag>[0], event: React.PointerEvent) => {
      if (!canWrite) return;
      startDrag(sku, event);
    },
    [canWrite, startDrag],
  );

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <PlanogramViewport
          viewportRef={viewportRef}
          transform={transform}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onFitToView={handleFitToView}
          canUndo={canWrite && history.canUndo}
          canRedo={canWrite && history.canRedo}
          onUndo={canWrite ? () => void handleUndo() : undefined}
          onRedo={canWrite ? () => void handleRedo() : undefined}
          onExportSvg={handleExportSvg}
          onExportPdf={handleExportPdf}
        >
          {viewMode === "3d" ? (
            <Planogram3DPreview
              layout={layout}
              state={displayState}
              skuById={skuById}
              fitToken={fit3dToken}
            />
          ) : (
            <PlanogramCanvas
              canvasRef={canvasRef}
              layout={layout}
              state={displayState}
              skuById={skuById}
              drag={drag}
              shelfResize={shelfResize}
              shelfWidthResize={shelfWidthResize}
              selectedItemId={selectedItemId}
              activeShelfId={activeShelfId}
              onItemPointerDown={handleItemPointerDown}
              onShelfResizePointerDown={handleShelfResizePointerDown}
              onShelfWidthResizePointerDown={handleShelfWidthResizePointerDown}
              onCanvasPointerDown={() => setSelectedItemId(null)}
            />
          )}
        </PlanogramViewport>

        <PlanogramItemInspector
          state={state}
          selectedItemId={selectedItemId}
          skuById={skuById}
          canWrite={canWrite}
          onChangeFacings={changeSelectedFacings}
          onShelfLayout={(mode) => void applyShelfLayout(mode)}
        />
      </div>

      {showCursorPreview && (
        <DragItemPreview
          sku={drag.sku}
          clientX={drag.clientX}
          clientY={drag.clientY}
          valid={false}
        />
      )}

      <EditorBottomMenu
        skus={skus}
        canWrite={canWrite}
        onSkuPointerDown={handleSkuPointerDown}
        open={bottomMenuOpen}
        onToggle={onBottomMenuToggle}
      />
    </div>
  );
}
