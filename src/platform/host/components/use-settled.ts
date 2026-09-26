"use client";
import { useEffect, useState } from "react";

/**
 * A value that only follows once it has held still for `ms`. The home screen
 * uses it for the big backdrop clip: holding an arrow key flicks through
 * games many times a second, and starting a video for each one made the
 * whole row lag. The first value shows at once.
 */
export function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (Object.is(value, settled)) return;
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, settled, ms]);
  return settled;
}
