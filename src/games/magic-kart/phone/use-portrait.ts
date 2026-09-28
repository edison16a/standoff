"use client";
import { useEffect, useState } from "react";
import { watchPortrait } from "./orientation-watch";

/**
 * How long the page must stay upright before the race hides the pedals.
 * A hard turn of the wheel can swing the page upright for a moment, and
 * hiding the pedals then would drop the thumb on Drive.
 */
export const PORTRAIT_SETTLE_MS = 900;

/**
 * True while the page is taller than it is wide, which for a phone means
 * held upright. With `settleMs`, upright only counts once it has lasted
 * that long, while sideways counts at once.
 */
export function usePortrait(settleMs = 0): boolean {
  const [raw, setRaw] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => watchPortrait(window, setRaw), []);

  useEffect(() => {
    if (!raw || settleMs <= 0) {
      setSettled(raw);
      return;
    }
    const timer = setTimeout(() => setSettled(true), settleMs);
    return () => clearTimeout(timer);
  }, [raw, settleMs]);

  return settleMs > 0 ? raw && settled : raw;
}
