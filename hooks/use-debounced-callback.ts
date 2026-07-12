"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T>(
  callback: (value: T) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = value;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending !== null) {
          callbackRef.current(pending);
        }
      }, delayMs);
    },
    [delayMs],
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending !== null) {
      callbackRef.current(pending);
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  return { schedule, cancel, flush };
}
