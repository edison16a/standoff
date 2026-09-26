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
