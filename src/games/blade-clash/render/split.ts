import type { Slot } from "@/games/blade-clash/players";

/** A part of the screen, as shares of its width and height from the top left. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Who sees what: player one plays on the left half, player two on the
 * right, each over the shoulder of their own fighter. The renderer, the
 * overlays and the little split map all read these, so they always agree.
 */
export const VIEWS: Record<Slot, ViewRect> = {
  1: { x: 0, y: 0, w: 0.5, h: 1 },
  2: { x: 0.5, y: 0, w: 0.5, h: 1 },
};

/** The whole screen, for the winner's ceremony. */
export const FULL: ViewRect = { x: 0, y: 0, w: 1, h: 1 };

/** A part of the screen in whole pixels from the bottom left, as WebGL's viewport takes it. */
export function pixels(rect: ViewRect, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const h = Math.round(rect.h * height);
  return { x: Math.round(rect.x * width), y: Math.round((1 - rect.y - rect.h) * height), w: Math.round(rect.w * width), h };
}
