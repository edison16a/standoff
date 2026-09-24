"use client";
import { useEffect, useRef } from "react";

/**
 * Calls `callback` every animation frame while mounted. For readouts that
 * change every frame (a gauge, a meter) this writes straight to the DOM
 * and skips React renders entirely.
 */
export function useAnimationFrame(callback: (now: number) => void): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => {
      latest.current(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
}
