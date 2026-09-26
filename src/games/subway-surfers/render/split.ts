/** A part of the canvas, each value a share of its width or height, from the top left. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The rectangles for one runner, or two side by side with player one on
 * the left. No three.js here, so the overlay lays itself out from the
 * very same rects the picture is drawn in.
 */
export function splitScreen(count: number): ViewRect[] {
  if (count <= 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
  return [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 },
  ];
}
