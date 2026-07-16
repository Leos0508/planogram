"use client";

import {
  invertHistoryEntry,
  type PlanogramHistoryEntry,
} from "@/lib/planogram-editor/history";
import type { PlanogramItem, PlanogramState } from "@/lib/planogram-engine";
import { useCallback, useRef, useState } from "react";

export function usePlanogramHistory() {
  const undoStackRef = useRef<PlanogramHistoryEntry[]>([]);
  const redoStackRef = useRef<PlanogramHistoryEntry[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  const syncCounts = useCallback(() => {
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
  }, []);

  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncCounts();
  }, [syncCounts]);

  const push = useCallback(
    (entry: PlanogramHistoryEntry) => {
      undoStackRef.current = [...undoStackRef.current, entry];
      redoStackRef.current = [];
      syncCounts();
    },
    [syncCounts],
  );

  const popUndo = useCallback((): PlanogramHistoryEntry | null => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return null;

    const entry = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, entry];
    syncCounts();
    return entry;
  }, [syncCounts]);

  const popRedo = useCallback((): PlanogramHistoryEntry | null => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return null;

    const entry = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, entry];
    syncCounts();
    return entry;
  }, [syncCounts]);

  return {
    canUndo: undoCount > 0,
    canRedo: redoCount > 0,
    push,
    clear,
    popUndo,
    popRedo,
    invert: invertHistoryEntry,
  };
}

export function removeItemFromState(
  state: PlanogramState,
  itemId: string,
): PlanogramState {
  return {
    ...state,
    shelves: state.shelves.map((shelf) => ({
      ...shelf,
      items: shelf.items.filter((item) => item.id !== itemId),
    })),
  };
}

export function addItemToState(
  state: PlanogramState,
  item: PlanogramItem,
): PlanogramState {
  return {
    ...state,
    shelves: state.shelves.map((shelf) =>
      shelf.id === item.shelfId
        ? { ...shelf, items: [...shelf.items, item] }
        : shelf,
    ),
  };
}

export function setItemFacingsInState(
  state: PlanogramState,
  itemId: string,
  facingsWide: number,
): PlanogramState {
  return {
    ...state,
    shelves: state.shelves.map((shelf) => ({
      ...shelf,
      items: shelf.items.map((item) =>
        item.id === itemId ? { ...item, facingsWide } : item,
      ),
    })),
  };
}

export function moveItemInState(
  state: PlanogramState,
  itemId: string,
  target: { shelfId: string; x: number; y: number },
): PlanogramState {
  let moving: PlanogramItem | null = null;

  const without = state.shelves.map((shelf) => {
    const item = shelf.items.find((row) => row.id === itemId);
    if (!item) return shelf;
    moving = item;
    return {
      ...shelf,
      items: shelf.items.filter((row) => row.id !== itemId),
    };
  });

  if (!moving) return state;

  const item: PlanogramItem = moving;
  return {
    ...state,
    shelves: without.map((shelf) =>
      shelf.id === target.shelfId
        ? {
            ...shelf,
            items: [
              ...shelf.items,
              {
                ...item,
                shelfId: target.shelfId,
                x: target.x,
                y: target.y,
              },
            ],
          }
        : shelf,
    ),
  };
}

export function setItemsPositionsInState(
  state: PlanogramState,
  updates: Array<{ itemId: string; x: number }>,
): PlanogramState {
  const byId = new Map(updates.map((update) => [update.itemId, update.x]));

  return {
    ...state,
    shelves: state.shelves.map((shelf) => ({
      ...shelf,
      items: shelf.items.map((item) => {
        const x = byId.get(item.id);
        return x !== undefined ? { ...item, x } : item;
      }),
    })),
  };
}

export function setShelfMinContentHeightInState(
  state: PlanogramState,
  shelfId: string,
  minContentHeightMm: number,
): PlanogramState {
  return {
    ...state,
    shelves: state.shelves.map((shelf) =>
      shelf.id === shelfId ? { ...shelf, minContentHeightMm } : shelf,
    ),
  };
}

export function setShelfMinContentWidthInState(
  state: PlanogramState,
  shelfId: string,
  minContentWidthMm: number,
): PlanogramState {
  return {
    ...state,
    shelves: state.shelves.map((shelf) =>
      shelf.id === shelfId ? { ...shelf, minContentWidthMm } : shelf,
    ),
  };
}

export type { PlanogramHistoryEntry };
