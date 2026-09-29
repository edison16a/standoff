/** A part of the canvas, each value a share of its width or height, from the top left. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The whole canvas: one runner fills the screen. */
export const FULL_VIEW: ViewRect = { x: 0, y: 0, w: 1, h: 1 };
